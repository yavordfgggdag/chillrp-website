package net.thelastrepublic.shopdelivery;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.entity.Player;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

final class ClaimCommand implements CommandExecutor {

  private final TlrShopDeliveryPlugin plugin;
  private final Map<UUID, Long> cooldownUntil = new ConcurrentHashMap<>();

  ClaimCommand(TlrShopDeliveryPlugin plugin) {
    this.plugin = plugin;
  }

  @Override
  public boolean onCommand(
      @NotNull CommandSender sender,
      @NotNull Command command,
      @NotNull String label,
      @NotNull String[] args
  ) {
    if (!(sender instanceof Player player)) {
      sender.sendMessage(Component.text("Само играчи в игра.", NamedTextColor.RED));
      return true;
    }

    String apiUrl = plugin.getConfig().getString("api-url", "").trim();
    String secret = plugin.getConfig().getString("secret", "").trim();
    if (apiUrl.isEmpty() || secret.isEmpty()) {
      player.sendMessage(Component.text(
          "Магазинът не е настроен на сървъра (api-url / secret).",
          NamedTextColor.RED
      ));
      return true;
    }

    int cd = Math.max(0, plugin.getConfig().getInt("cooldown-seconds", 45));
    long now = System.currentTimeMillis();
    Long until = cooldownUntil.get(player.getUniqueId());
    if (until != null && now < until) {
      long left = (until - now + 999) / 1000;
      player.sendMessage(Component.text("Изчакай " + left + " сек.", NamedTextColor.YELLOW));
      return true;
    }

    player.sendMessage(Component.text("Проверка на покупки…", NamedTextColor.GRAY));

    Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
      try {
        ClaimApiClient.ClaimResult result = ClaimApiClient.post(
            apiUrl,
            secret,
            player.getName(),
            player.getUniqueId().toString()
        );

        Bukkit.getScheduler().runTask(plugin, () -> finish(player, result, cd, now));
      } catch (Exception e) {
        plugin.getLogger().warning("claim HTTP: " + e.getMessage());
        Bukkit.getScheduler().runTask(plugin, () -> {
          player.sendMessage(Component.text(
              "Грешка при връзка с магазина. Опитай по-късно.",
              NamedTextColor.RED
          ));
        });
      }
    });

    return true;
  }

  private void finish(Player player, ClaimApiClient.ClaimResult result, int cd, long now) {
    if (!player.isOnline()) {
      return;
    }

    if (!result.ok) {
      if ("unauthorized".equals(result.errorCode)) {
        player.sendMessage(Component.text(
            "Невалиден секрет (secret) — провери config.yml и Supabase.",
            NamedTextColor.RED
        ));
      } else if (result.errorCode != null && result.errorCode.startsWith("http_")) {
        player.sendMessage(Component.text(
            "Сървърът върна грешка (" + result.errorCode + ").",
            NamedTextColor.RED
        ));
      } else {
        player.sendMessage(Component.text(
            "Неуспешен отговор от магазина.",
            NamedTextColor.RED
        ));
      }
      return;
    }

    if (result.deliveries.isEmpty()) {
      String msg = result.message != null ? result.message : "";
      if ("no_profile".equals(msg)) {
        player.sendMessage(Component.text(
            "Няма такова Minecraft име в сайта. Влез в сайта и задай същото име като тук.",
            NamedTextColor.YELLOW
        ));
      } else if ("nothing_pending".equals(msg)) {
        player.sendMessage(Component.text("Няма чакащи покупки.", NamedTextColor.GRAY));
      } else if ("nothing_to_claim".equals(msg)) {
        player.sendMessage(Component.text(
            "Има покупки, но няма настроени команди за Minecraft (minecraft_grants_json в продукта).",
            NamedTextColor.YELLOW
        ));
      } else {
        player.sendMessage(Component.text("Няма какво да се вземе в момента.", NamedTextColor.GRAY));
      }
      if (result.hint != null && !result.hint.isEmpty()) {
        player.sendMessage(Component.text(result.hint, NamedTextColor.DARK_GRAY));
      }
      cooldownUntil.put(player.getUniqueId(), now + cd * 1000L);
      return;
    }

    boolean dryRun = plugin.getConfig().getBoolean("dry-run", false);
    int total = 0;

    for (ClaimApiClient.Delivery d : result.deliveries) {
      List<String> cmds = new ArrayList<>();
      if (d.commands != null) {
        cmds.addAll(d.commands);
      }
      cmds.addAll(extraForProduct(d.productName));

      for (String raw : cmds) {
        String line = expandLocal(raw, player);
        total++;
        if (dryRun) {
          plugin.getLogger().info("[dry-run] " + line);
        } else {
          Bukkit.dispatchCommand(Bukkit.getConsoleSender(), line);
        }
      }
    }

    player.sendMessage(Component.text(
        dryRun ? ("[тест] " + total + " команди (виж конзолата).") : ("Получи наградите си (" + total + " команди)."),
        NamedTextColor.GREEN
    ));
    cooldownUntil.put(player.getUniqueId(), now + cd * 1000L);
  }

  private List<String> extraForProduct(String productName) {
    if (productName == null || productName.isEmpty()) {
      return List.of();
    }
    ConfigurationSection root = plugin.getConfig().getConfigurationSection("extra-commands-by-product");
    if (root == null) {
      return List.of();
    }
    if (!root.contains(productName)) {
      return List.of();
    }
    return root.getStringList(productName);
  }

  private static String expandLocal(String cmd, Player player) {
    return cmd
        .replace("{player}", player.getName())
        .replace("{name}", player.getName())
        .replace("{uuid}", player.getUniqueId().toString());
  }
}
