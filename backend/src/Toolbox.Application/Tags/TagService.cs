using Toolbox.Domain.Entities;

namespace Toolbox.Application.Tags;

public sealed class TagService(ITagRepository repository)
{
    public async Task<IReadOnlyList<TagSummary>> ListAsync(
        string? search,
        CancellationToken cancellationToken)
    {
        var tags = await repository.ListAsync(search, cancellationToken);
        return tags.OrderBy(tag => tag.Name).Select(TagMapping.ToSummary).ToArray();
    }

    public async Task<TagSummary> CreateAsync(
        CreateTagCommand command,
        CancellationToken cancellationToken)
    {
        var normalizedName = Tag.NormalizeName(command.Name);
        await EnsureNameAvailable(normalizedName, null, cancellationToken);

        var tag = Tag.Create(command.Name);
        await repository.AddAsync(tag, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        return TagMapping.ToSummary(tag);
    }

    public async Task<TagSummary> UpdateAsync(
        Guid id,
        UpdateTagCommand command,
        CancellationToken cancellationToken)
    {
        var tag = await repository.GetAsync(id, includeUsage: false, cancellationToken)
            ?? throw new TagNotFoundException(id);
        var normalizedName = Tag.NormalizeName(command.Name);
        await EnsureNameAvailable(normalizedName, id, cancellationToken);

        tag.Rename(command.Name);
        await repository.SaveChangesAsync(cancellationToken);
        return TagMapping.ToSummary(tag);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var tag = await repository.GetAsync(id, includeUsage: true, cancellationToken)
            ?? throw new TagNotFoundException(id);

        if (tag.ItemTags.Count > 0)
        {
            throw new TagConflictException("A tag assigned to items cannot be deleted.");
        }

        repository.Remove(tag);
        await repository.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureNameAvailable(
        string normalizedName,
        Guid? excludingId,
        CancellationToken cancellationToken)
    {
        if (await repository.ExistsWithNormalizedNameAsync(normalizedName, excludingId, cancellationToken))
        {
            throw new TagConflictException("A tag with this name already exists.");
        }
    }
}
