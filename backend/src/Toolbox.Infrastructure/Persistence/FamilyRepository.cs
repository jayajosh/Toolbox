using Microsoft.EntityFrameworkCore;
using Toolbox.Application.Families;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence;

internal sealed class FamilyRepository(ToolboxDbContext db) : IFamilyRepository
{
    public async Task<IReadOnlyList<ItemFamily>> ListAsync(CancellationToken cancellationToken) =>
        await db.Families
            .AsNoTracking()
            .Include(family => family.Children)
            .Include(family => family.Items)
            .ToListAsync(cancellationToken);

    public async Task<ItemFamily?> GetAsync(
        Guid id,
        bool includeContents,
        CancellationToken cancellationToken)
    {
        IQueryable<ItemFamily> query = db.Families;
        if (includeContents)
        {
            query = query
                .Include(family => family.Children)
                .Include(family => family.Items);
        }

        return await query.SingleOrDefaultAsync(family => family.Id == id, cancellationToken);
    }

    public Task AddAsync(ItemFamily family, CancellationToken cancellationToken)
    {
        db.Families.Add(family);
        return Task.CompletedTask;
    }

    public void Remove(ItemFamily family) => db.Families.Remove(family);

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        db.SaveChangesAsync(cancellationToken);
}
