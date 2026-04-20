package net.thelastrepublic.shopdelivery;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.annotations.SerializedName;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

final class ClaimApiClient {

  private static final Gson GSON = new Gson();
  private static final HttpClient HTTP = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(10))
      .build();

  private ClaimApiClient() {}

  static ClaimResult post(String apiUrl, String secret, String ign, String uuid) throws Exception {
    Objects.requireNonNull(apiUrl, "api-url");
    Objects.requireNonNull(secret, "secret");
    Objects.requireNonNull(ign, "ign");

    JsonObject body = new JsonObject();
    body.addProperty("ign", ign);
    if (uuid != null && !uuid.isEmpty()) {
      body.addProperty("uuid", uuid);
    }

    HttpRequest req = HttpRequest.newBuilder()
        .uri(URI.create(apiUrl.trim()))
        .header("Content-Type", "application/json")
        .header("x-tlr-mc-claim-secret", secret.trim())
        .timeout(Duration.ofSeconds(20))
        .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
        .build();

    HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    String raw = res.body() == null ? "" : res.body();

    if (res.statusCode() == 401) {
      return ClaimResult.unauthorized();
    }
    if (res.statusCode() >= 400) {
      return ClaimResult.httpError(res.statusCode(), raw);
    }

    ClaimResponse parsed = GSON.fromJson(raw, ClaimResponse.class);
    if (parsed == null) {
      return ClaimResult.parseError();
    }
    if (parsed.error != null && !parsed.error.isEmpty()) {
      return ClaimResult.apiError(parsed.error);
    }

    List<Delivery> list = parsed.deliveries != null ? parsed.deliveries : Collections.emptyList();
    return new ClaimResult(true, null, list, parsed.message, parsed.hint, res.statusCode());
  }

  static final class ClaimResult {
    final boolean ok;
    final String errorCode;
    final List<Delivery> deliveries;
    final String message;
    final String hint;
    final int httpStatus;

    private ClaimResult(
        boolean ok,
        String errorCode,
        List<Delivery> deliveries,
        String message,
        String hint,
        int httpStatus
    ) {
      this.ok = ok;
      this.errorCode = errorCode;
      this.deliveries = deliveries == null ? List.of() : deliveries;
      this.message = message;
      this.hint = hint;
      this.httpStatus = httpStatus;
    }

    static ClaimResult unauthorized() {
      return new ClaimResult(false, "unauthorized", List.of(), null, null, 401);
    }

    static ClaimResult httpError(int code, String body) {
      return new ClaimResult(false, "http_" + code, List.of(), body, null, code);
    }

    static ClaimResult parseError() {
      return new ClaimResult(false, "bad_response", List.of(), null, null, 0);
    }

    static ClaimResult apiError(String err) {
      return new ClaimResult(false, err, List.of(), null, null, 0);
    }
  }

  static final class Delivery {
    @SerializedName("purchase_id")
    String purchaseId;
    @SerializedName("product_name")
    String productName;
    List<String> commands;
  }

  private static final class ClaimResponse {
    List<Delivery> deliveries;
    String message;
    String hint;
    String error;
  }
}
