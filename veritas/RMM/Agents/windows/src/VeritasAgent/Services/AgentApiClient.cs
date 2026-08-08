using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using VeritasAgent.Models;

namespace VeritasAgent.Services;

public sealed class AgentApiClient : IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _http;
    private readonly ILogger<AgentApiClient> _logger;

    public AgentApiClient(ILogger<AgentApiClient> logger)
    {
        _logger = logger;
        _http = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(60)
        };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd($"VeritasAgent/{AgentConstants.AgentVersion}");
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public static string NormalizeApiBase(string apiUrl)
    {
        var baseUrl = (apiUrl ?? "").Trim().TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
            throw new InvalidOperationException("Missing API URL");
        if (!baseUrl.EndsWith("/api", StringComparison.OrdinalIgnoreCase))
            baseUrl += "/api";
        return baseUrl;
    }

    public async Task<EnrollPreviewResponse> PreviewEnrollmentAsync(string apiUrl, string enrollmentToken, CancellationToken ct)
    {
        var url = $"{NormalizeApiBase(apiUrl)}/rmm/enroll/preview";
        using var response = await SendWithRetryAsync(() =>
        {
            var msg = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(new { enrollmentToken }, options: JsonOptions)
            };
            return msg;
        }, ct);

        if (!response.IsSuccessStatusCode)
            throw await ToApiException(response);

        return await response.Content.ReadFromJsonAsync<EnrollPreviewResponse>(JsonOptions, ct)
               ?? throw new InvalidOperationException("Empty preview response");
    }

    /// <summary>One-shot preview for the setup wizard (no DI).</summary>
    public static async Task<EnrollPreviewResponse> PreviewEnrollmentStaticAsync(
        string apiUrl, string enrollmentToken, CancellationToken ct = default)
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        http.DefaultRequestHeaders.UserAgent.ParseAdd($"VeritasAgent/{AgentConstants.AgentVersion}");
        http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        var url = $"{NormalizeApiBase(apiUrl)}/rmm/enroll/preview";
        using var response = await http.PostAsJsonAsync(url, new { enrollmentToken }, JsonOptions, ct);
        if (!response.IsSuccessStatusCode)
        {
            var err = await ReadError(response);
            throw new InvalidOperationException($"HTTP {(int)response.StatusCode}: {err}");
        }
        return await response.Content.ReadFromJsonAsync<EnrollPreviewResponse>(JsonOptions, ct)
               ?? throw new InvalidOperationException("Empty preview response");
    }

    public async Task<EnrollResponse> EnrollAsync(string apiUrl, EnrollRequest request, CancellationToken ct)
    {
        var url = $"{NormalizeApiBase(apiUrl)}/rmm/enroll";
        using var response = await SendWithRetryAsync(() =>
        {
            var msg = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(request, options: JsonOptions)
            };
            return msg;
        }, ct);

        if (!response.IsSuccessStatusCode)
            throw await ToApiException(response);

        var body = await response.Content.ReadFromJsonAsync<EnrollResponse>(JsonOptions, ct)
                   ?? throw new InvalidOperationException("Empty enroll response");
        if (string.IsNullOrWhiteSpace(body.AgentSecret))
            throw new InvalidOperationException("Enroll response missing agentSecret");
        return body;
    }

    public async Task<HeartbeatResponse> HeartbeatAsync(string apiUrl, string agentSecret, HeartbeatRequest request, CancellationToken ct)
    {
        var url = $"{NormalizeApiBase(apiUrl)}/rmm/heartbeat";
        using var response = await SendWithRetryAsync(() =>
        {
            var msg = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(request, options: JsonOptions)
            };
            msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", agentSecret);
            return msg;
        }, ct);

        if (response.StatusCode is System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden)
            throw new AgentAuthException(await ReadError(response));

        if (!response.IsSuccessStatusCode)
            throw await ToApiException(response);

        return await response.Content.ReadFromJsonAsync<HeartbeatResponse>(JsonOptions, ct)
               ?? new HeartbeatResponse { Ok = true };
    }

    public async Task<AgentCommandsResponse> FetchCommandsAsync(string apiUrl, string agentSecret, CancellationToken ct)
    {
        var url = $"{NormalizeApiBase(apiUrl)}/rmm/agent/commands";
        using var response = await SendWithRetryAsync(() =>
        {
            var msg = new HttpRequestMessage(HttpMethod.Get, url);
            msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", agentSecret);
            return msg;
        }, ct);

        if (response.StatusCode is System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden)
            throw new AgentAuthException(await ReadError(response));

        if (!response.IsSuccessStatusCode)
            throw await ToApiException(response);

        return await response.Content.ReadFromJsonAsync<AgentCommandsResponse>(JsonOptions, ct)
               ?? new AgentCommandsResponse();
    }

    public async Task<string> DownloadMsiAsync(string apiUrl, string agentSecret, string destinationPath, CancellationToken ct)
    {
        var url = $"{NormalizeApiBase(apiUrl)}/rmm/agent/update/windows/msi";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", agentSecret);
        using var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
            throw await ToApiException(response);

        await using var input = await response.Content.ReadAsStreamAsync(ct);
        await using var output = File.Create(destinationPath);
        await input.CopyToAsync(output, ct);
        return destinationPath;
    }

    private async Task<HttpResponseMessage> SendWithRetryAsync(Func<HttpRequestMessage> factory, CancellationToken ct)
    {
        Exception? last = null;
        for (var attempt = 0; attempt < 4; attempt++)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                using var request = factory();
                var response = await _http.SendAsync(request, ct);
                if ((int)response.StatusCode >= 500 && attempt < 3)
                {
                    response.Dispose();
                    await DelayBackoff(attempt, ct);
                    continue;
                }
                return response;
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && attempt < 3)
            {
                last = ex;
                _logger.LogWarning(ex, "API request failed (attempt {Attempt})", attempt + 1);
                await DelayBackoff(attempt, ct);
            }
        }
        throw last ?? new InvalidOperationException("API request failed");
    }

    private static async Task DelayBackoff(int attempt, CancellationToken ct)
    {
        var jitter = Random.Shared.Next(250, 1250);
        var delay = TimeSpan.FromMilliseconds(Math.Pow(2, attempt) * 500 + jitter);
        await Task.Delay(delay, ct);
    }

    private static async Task<Exception> ToApiException(HttpResponseMessage response)
    {
        var msg = await ReadError(response);
        return new InvalidOperationException($"HTTP {(int)response.StatusCode}: {msg}");
    }

    private static async Task<string> ReadError(HttpResponseMessage response)
    {
        try
        {
            var text = await response.Content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(text)) return response.ReasonPhrase ?? "error";
            using var doc = JsonDocument.Parse(text);
            if (doc.RootElement.TryGetProperty("error", out var err))
                return err.GetString() ?? text;
            return text;
        }
        catch
        {
            return response.ReasonPhrase ?? "error";
        }
    }

    public void Dispose() => _http.Dispose();
}

public sealed class AgentAuthException : Exception
{
    public AgentAuthException(string message) : base(message) { }
}
