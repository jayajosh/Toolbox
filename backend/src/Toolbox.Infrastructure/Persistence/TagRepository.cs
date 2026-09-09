using Microsoft.EntityFrameworkCore;
using Toolbox.Application.Tags;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence;

internal sealed class TagRepository(ToolboxDbContext db) : ITagRepository
{
    public async Task<IReadOnlyList<Tag>> ListAsync(
        string? search,
        CancellationToken cancellationToken)
    {
        IQueryable<Tag> query = db.Tags.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{EscapeLikePattern(search.Trim())}%";
            query = query.Where(tag => EF.Functions.ILike(tag.Name, pattern, "\\"));
        }

        return await query.OrderBy(tag => tag.Name).ToListAsync(cancellationToken);
    }

    public async Task<Tag?> GetAsync(
        Guid id,
        bool includeUsage,
        CancellationToken cancellationToken)
    {
        IQueryable<Tag> query = db.Tags;
        if (includeUsage)
        {
            query = query.Include(tag => tag.ItemTags);
        }

        return await query.SingleOrDefaultAsync(tag => tag.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Tag>> GetByIdsAsync(
        IReadOnlyCollection<Guid> ids,
        CancellationToken cancellationToken) =>
        await db.Tags
            .Where(tag => ids.Contains(tag.Id))
            .ToListAsync(cancellationToken);

    public Task<bool> ExistsWithNormalizedNameAsync(
        string normalizedName,
        Guid? excludingId,
        CancellationToken cancellationToken) =>
        db.Tags.AnyAsync(
            tag => tag.NormalizedName == normalizedName
                && (excludingId == null || tag.Id != excludingId.Value),
            cancellationToken);

    public Task AddAsync(Tag tag, CancellationToken cancellationToken)
    {
        db.Tags.Add(tag);
        return Task.CompletedTask;
    }

    public void Remove(Tag tag) => db.Tags.Remove(tag);

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        db.SaveChangesAsync(cancellationToken);

    private static string EscapeLikePattern(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
