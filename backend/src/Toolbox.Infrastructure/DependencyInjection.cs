using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Toolbox.Application.Items;
using Toolbox.Application.Locations;
using Toolbox.Application.Tags;
using Toolbox.Application.Families;
using Toolbox.Infrastructure.Persistence;

namespace Toolbox.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddToolboxInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection must be configured.");
        }

        services.AddDbContext<ToolboxDbContext>(options =>
            options.UseNpgsql(
                connectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(ToolboxDbContext).Assembly.FullName)));

        services.AddScoped<ILocationRepository, LocationRepository>();
        services.AddScoped<IItemRepository, ItemRepository>();
        services.AddScoped<ITagRepository, TagRepository>();
        services.AddScoped<IFamilyRepository, FamilyRepository>();

        services.AddHealthChecks()
            .AddDbContextCheck<ToolboxDbContext>("database");

        return services;
    }
}
