namespace VeritasAgent.Services;

internal sealed class FileLoggerProvider : ILoggerProvider
{
    private readonly string _directory;

    public FileLoggerProvider(string directory)
    {
        _directory = directory;
        Directory.CreateDirectory(directory);
    }

    public ILogger CreateLogger(string categoryName) => new FileLogger(_directory, categoryName);

    public void Dispose() { }
}

internal sealed class FileLogger : ILogger
{
    private readonly string _directory;
    private readonly string _category;
    private static readonly object Gate = new();

    public FileLogger(string directory, string category)
    {
        _directory = directory;
        _category = category;
    }

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Information;

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        if (!IsEnabled(logLevel)) return;
        var line = $"{DateTime.UtcNow:o} [{logLevel}] {_category}: {formatter(state, exception)}";
        if (exception is not null) line += Environment.NewLine + exception;
        var path = Path.Combine(_directory, $"agent-{DateTime.UtcNow:yyyyMMdd}.log");
        lock (Gate)
        {
            File.AppendAllText(path, line + Environment.NewLine);
        }
    }
}
