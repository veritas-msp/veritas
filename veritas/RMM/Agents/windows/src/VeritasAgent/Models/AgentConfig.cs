using System.Text.Json.Serialization;

namespace VeritasAgent.Models;

public sealed class AgentConfig
{
    public string ApiUrl { get; set; } = "";
    public string? EnrollmentToken { get; set; }
    public string? AgentSecret { get; set; }
    public string? AgentId { get; set; }
    public string? ClientId { get; set; }
    public string EquipmentFamily { get; set; } = "ordinateurs";
    public int HeartbeatIntervalMinutes { get; set; } = 5;
    public bool AutoUpdateEnabled { get; set; } = true;
    public Dictionary<string, bool> Collectors { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string? LatestServerVersion { get; set; }
}

public sealed class BootstrapConfig
{
    public string? ApiUrl { get; set; }
    public string? EnrollmentToken { get; set; }
    public string? EquipmentFamily { get; set; }
}

public sealed class EnrollRequest
{
    [JsonPropertyName("enrollmentToken")]
    public string EnrollmentToken { get; set; } = "";

    [JsonPropertyName("machineId")]
    public string MachineId { get; set; } = "";

    [JsonPropertyName("hostname")]
    public string? Hostname { get; set; }

    [JsonPropertyName("agentVersion")]
    public string AgentVersion { get; set; } = AgentConstants.AgentVersion;

    [JsonPropertyName("equipmentFamily")]
    public string EquipmentFamily { get; set; } = "ordinateurs";
}

public sealed class EnrollResponse
{
    [JsonPropertyName("agentId")]
    [JsonConverter(typeof(FlexibleStringConverter))]
    public string? AgentId { get; set; }

    [JsonPropertyName("clientId")]
    [JsonConverter(typeof(FlexibleStringConverter))]
    public string? ClientId { get; set; }

    [JsonPropertyName("agentSecret")]
    public string? AgentSecret { get; set; }

    [JsonPropertyName("equipmentFamily")]
    public string? EquipmentFamily { get; set; }

    [JsonPropertyName("config")]
    public AgentRemoteConfig? Config { get; set; }
}

public sealed class EnrollPreviewResponse
{
    [JsonPropertyName("ok")]
    public bool Ok { get; set; }

    [JsonPropertyName("clientId")]
    [JsonConverter(typeof(FlexibleStringConverter))]
    public string? ClientId { get; set; }

    [JsonPropertyName("clientName")]
    public string? ClientName { get; set; }

    [JsonPropertyName("tokenLabel")]
    public string? TokenLabel { get; set; }

    [JsonPropertyName("maxUses")]
    public int? MaxUses { get; set; }

    [JsonPropertyName("usesCount")]
    public int UsesCount { get; set; }

    [JsonPropertyName("usesRemaining")]
    public int? UsesRemaining { get; set; }

    [JsonPropertyName("agentsTotal")]
    public int AgentsTotal { get; set; }

    [JsonPropertyName("agentsActive")]
    public int AgentsActive { get; set; }

    [JsonPropertyName("agentsRevoked")]
    public int AgentsRevoked { get; set; }

    [JsonPropertyName("workstationsTotal")]
    public int WorkstationsTotal { get; set; }

    [JsonPropertyName("serversTotal")]
    public int ServersTotal { get; set; }

    [JsonPropertyName("devicesTotal")]
    public int DevicesTotal { get; set; }
}

public sealed class HeartbeatRequest
{
    [JsonPropertyName("agentVersion")]
    public string AgentVersion { get; set; } = AgentConstants.AgentVersion;

    [JsonPropertyName("hostname")]
    public string? Hostname { get; set; }

    [JsonPropertyName("inventory")]
    public Dictionary<string, object?> Inventory { get; set; } = new();
}

public sealed class HeartbeatResponse
{
    [JsonPropertyName("ok")]
    public bool Ok { get; set; }

    [JsonPropertyName("config")]
    public AgentRemoteConfig? Config { get; set; }
}

public sealed class AgentRemoteConfig
{
    [JsonPropertyName("heartbeatIntervalMinutes")]
    public int? HeartbeatIntervalMinutes { get; set; }

    [JsonPropertyName("collectors")]
    public Dictionary<string, bool>? Collectors { get; set; }

    [JsonPropertyName("fullSyncRequested")]
    public bool? FullSyncRequested { get; set; }

    [JsonPropertyName("immediateHeartbeatRequested")]
    public bool? ImmediateHeartbeatRequested { get; set; }

    [JsonPropertyName("agentVersion")]
    public string? AgentVersion { get; set; }

    [JsonPropertyName("latestAgentVersion")]
    public string? LatestAgentVersion { get; set; }

    [JsonPropertyName("updateAvailable")]
    public bool? UpdateAvailable { get; set; }

    [JsonPropertyName("forceUpdateRequested")]
    public bool? ForceUpdateRequested { get; set; }

    [JsonPropertyName("autoUpdateEnabled")]
    public bool? AutoUpdateEnabled { get; set; }
}

public sealed class AgentCommandsResponse
{
    [JsonPropertyName("fullSyncRequested")]
    public bool FullSyncRequested { get; set; }

    [JsonPropertyName("syncRequestedAt")]
    public string? SyncRequestedAt { get; set; }

    [JsonPropertyName("forceUpdateRequested")]
    public bool ForceUpdateRequested { get; set; }

    [JsonPropertyName("immediateHeartbeatRequested")]
    public bool ImmediateHeartbeatRequested { get; set; }

    [JsonPropertyName("updateRequestedAt")]
    public string? UpdateRequestedAt { get; set; }

    [JsonPropertyName("heartbeatRequestedAt")]
    public string? HeartbeatRequestedAt { get; set; }

    [JsonPropertyName("latestAgentVersion")]
    public string? LatestAgentVersion { get; set; }

    [JsonPropertyName("heartbeatIntervalMinutes")]
    public int? HeartbeatIntervalMinutes { get; set; }
}
