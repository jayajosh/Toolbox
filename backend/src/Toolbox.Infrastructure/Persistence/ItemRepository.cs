using Microsoft.EntityFrameworkCore;
using Toolbox.Application.Items;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence;

internal sealed class ItemRepository(ToolboxDbContext db) : IItemRepository
{
    public async Task<IReadOnlyList<Item>> ListAsync(
        string? search,
        CancellationToken cancellationToken)
    {
        IQueryable<Item> query = db.Items
            .AsNoTracking()
            .Include(item => item.Checkouts)
            .Include(item => item.Family)
            .Include(item => item.ItemTags)
            .ThenInclude(itemTag => itemTag.Tag);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{EscapeLikePattern(search.Trim())}%";
            query = query.Where(item =>
                EF.Functions.ILike(item.Name, pattern, "\\")
                || (item.Family != null && EF.Functions.ILike(item.Family.Name, pattern, "\\"))
                || item.ItemTags.Any(itemTag => EF.Functions.ILike(itemTag.Tag.Name, pattern, "\\")));
        }

        return await query
            .OrderBy(item => item.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Item?> GetAsync(
        Guid id,
        bool includeCheckoutHistory,
        CancellationToken cancellationToken)
    {
        IQueryable<Item> query = db.Items
            .Include(item => item.Family)
            .Include(item => item.ItemTags)
            .ThenInclude(itemTag => itemTag.Tag);
        if (includeCheckoutHistory)
        {
            query = query.Include(item => item.Checkouts);
        }

        return await query.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
    }

    public Task AddAsync(Item item, CancellationToken cancellationToken)
    {
        db.Items.Add(item);
        return Task.CompletedTask;
    }

    public Task AddCheckoutAsync(Checkout checkout, CancellationToken cancellationToken)
    {
        db.Checkouts.Add(checkout);
        return Task.CompletedTask;
    }

    public void Remove(Item item) => db.Items.Remove(item);

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        db.SaveChangesAsync(cancellationToken);

    private static string EscapeLikePattern(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
