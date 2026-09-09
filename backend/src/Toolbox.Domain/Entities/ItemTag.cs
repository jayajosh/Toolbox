namespace Toolbox.Domain.Entities;

public sealed class ItemTag
{
    private ItemTag()
    {
    }

    private ItemTag(Guid itemId, Guid tagId)
    {
        ItemId = Guard.Required(itemId, nameof(itemId));
        TagId = Guard.Required(tagId, nameof(tagId));
    }

    public Guid ItemId { get; private set; }
    public Guid TagId { get; private set; }

    public Item Item { get; private set; } = null!;
    public Tag Tag { get; private set; } = null!;

    public static ItemTag Create(Guid itemId, Guid tagId) => new(itemId, tagId);
}
