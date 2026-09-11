using Microsoft.EntityFrameworkCore;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence;

public sealed class ToolboxDbContext(DbContextOptions<ToolboxDbContext> options) : DbContext(options)
{
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<Checkout> Checkouts => Set<Checkout>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<ItemFamily> Families => Set<ItemFamily>();
    public DbSet<ItemTag> ItemTags => Set<ItemTag>();
    public DbSet<SpacePlan> SpacePlans => Set<SpacePlan>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ToolboxDbContext).Assembly);
    }
}
