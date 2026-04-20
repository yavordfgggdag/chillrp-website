package net.thelastrepublic.shopdelivery;

import org.bukkit.plugin.java.JavaPlugin;

public final class TlrShopDeliveryPlugin extends JavaPlugin {

  @Override
  public void onEnable() {
    saveDefaultConfig();
    var claim = new ClaimCommand(this);
    var cmd = getCommand("claimshop");
    if (cmd != null) {
      cmd.setExecutor(claim);
    } else {
      getLogger().severe("Липсва команда claimshop в plugin.yml");
    }
  }
}
