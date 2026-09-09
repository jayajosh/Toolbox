namespace Toolbox.Domain.Entities;

public sealed class Checkout
{
    public const int BorrowerNameMaxLength = 200;
    public const int NotesMaxLength = 2_000;

    private Checkout()
    {
        BorrowerName = null!;
    }

    private Checkout(
        Guid id,
        Guid itemId,
        DateTime checkedOutAt,
        string borrowerName,
        string? notes)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        ItemId = Guard.Required(itemId, nameof(itemId));
        CheckedOutAt = Guard.Utc(checkedOutAt, nameof(checkedOutAt));
        BorrowerName = Guard.Required(borrowerName, nameof(borrowerName), BorrowerNameMaxLength);
        Notes = Guard.Optional(notes, nameof(notes), NotesMaxLength);
    }

    public Guid Id { get; private set; }
    public Guid ItemId { get; private set; }
    public DateTime CheckedOutAt { get; private set; }
    public DateTime? ReturnedAt { get; private set; }
    public string BorrowerName { get; private set; }
    public string? Notes { get; private set; }

    public Item Item { get; private set; } = null!;
    public bool IsActive => ReturnedAt is null;

    public static Checkout Create(
        Guid itemId,
        string borrowerName,
        string? notes = null,
        DateTime? checkedOutAt = null,
        Guid? id = null)
    {
        return new Checkout(
            id ?? Guid.NewGuid(),
            itemId,
            checkedOutAt ?? DateTime.UtcNow,
            borrowerName,
            notes);
    }

    public void Return(DateTime? returnedAt = null)
    {
        if (!IsActive)
        {
            throw new InvalidOperationException("This checkout has already been returned.");
        }

        var timestamp = Guard.Utc(returnedAt ?? DateTime.UtcNow, nameof(returnedAt));
        if (timestamp < CheckedOutAt)
        {
            throw new ArgumentException("An item cannot be returned before it was checked out.", nameof(returnedAt));
        }

        ReturnedAt = timestamp;
    }
}
