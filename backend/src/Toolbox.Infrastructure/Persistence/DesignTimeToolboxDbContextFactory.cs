using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Toolbox.Infrastructure.Persistence;

public sealed class DesignTimeToolboxDbContextFactory : IDesignTimeDbContextFactory<ToolboxDbContext>
{
    private const string LocalConnectionString =
        "Host=localhost;Port=5432;Database=toolbox;Username=toolbox;Password=toolbox";

    public ToolboxDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? LocalConnectionString;
        var optionsBuilder = new DbContextOptionsBuilder<ToolboxDbContext>();
        optionsBuilder.UseNpgsql(
            connectionString,
            npgsql => npgsql.MigrationsAssembly(typeof(ToolboxDbContext).Assembly.FullName));

        return new ToolboxDbContext(optionsBuilder.Options);
    }
}
