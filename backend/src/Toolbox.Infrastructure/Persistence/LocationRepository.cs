using Microsoft.EntityFrameworkCore;
using Toolbox.Application.Locations;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence;

internal sealed class LocationRepository(ToolboxDbContext db) : ILocationRepository
{
    public async Task<IReadOnlyList<Location>> ListAsync(CancellationToken cancellationToken) =>
        await db.Locations
            .AsNoTracking()
            .Include(location => location.Items)
            .ToListAsync(cancellationToken);

    public async Task<Location?> GetAsync(
        Guid id,
        bool includeContents,
        CancellationToken cancellationToken)
    {
        IQueryable<Location> query = db.Locations;
        if (includeContents)
        {
            query = query
                .Include(location => location.Children)
                .Include(location => location.Items);
        }

        return await query.SingleOrDefaultAsync(location => location.Id == id, cancellationToken);
    }

    public Task AddAsync(Location location, CancellationToken cancellationToken)
    {
        db.Locations.Add(location);
        return Task.CompletedTask;
    }

    public void Remove(Location location) => db.Locations.Remove(location);

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        db.SaveChangesAsync(cancellationToken);
}
