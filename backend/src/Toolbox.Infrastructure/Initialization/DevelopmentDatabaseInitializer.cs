using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Toolbox.Infrastructure.Persistence;

namespace Toolbox.Infrastructure.Initialization;

public sealed partial class DevelopmentDatabaseInitializer(
    IServiceScopeFactory scopeFactory,
    ILogger<DevelopmentDatabaseInitializer> logger) : IHostedService
{
    private const int MaxAttempts = 30;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(2);

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                await InitializeAsync(cancellationToken);
                return;
            }
            catch (Exception exception) when (attempt < MaxAttempts)
            {
                LogRetry(logger, exception, attempt, MaxAttempts);
                await Task.Delay(RetryDelay, cancellationToken);
            }
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task InitializeAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ToolboxDbContext>();
        await db.Database.MigrateAsync(cancellationToken);
        LogEmptyDatabaseReady(logger);
    }

    [LoggerMessage(
        LogLevel.Warning,
        "Database initialization attempt {Attempt} of {MaxAttempts} failed; retrying.")]
    private static partial void LogRetry(ILogger logger, Exception exception, int attempt, int maxAttempts);

    [LoggerMessage(LogLevel.Information, "Database migrations applied; development seed data is disabled.")]
    private static partial void LogEmptyDatabaseReady(ILogger logger);
}
