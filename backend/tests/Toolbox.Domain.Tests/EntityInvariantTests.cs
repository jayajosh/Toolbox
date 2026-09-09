using Toolbox.Domain.Entities;

namespace Toolbox.Domain.Tests;

public sealed class EntityInvariantTests
{
    [Fact]
    public void LocationDefaultsToOtherAndHasUtcTimestamps()
    {
        var location = Location.Create("Garage");

        Assert.Equal(Location.DefaultLocationType, location.LocationType);
        Assert.Equal(DateTimeKind.Utc, location.CreatedAt.Kind);
        Assert.Equal(DateTimeKind.Utc, location.UpdatedAt.Kind);
        Assert.Equal(location.CreatedAt, location.UpdatedAt);
    }

    [Fact]
    public void LocationRequiresANameAndRejectsSelfParenting()
    {
        Assert.Throws<ArgumentException>(() => Location.Create("  "));

        var location = Location.Create("Garage");
        Assert.Throws<ArgumentException>(() => location.MoveUnder(location.Id));
    }

    [Fact]
    public void NestedLocationKeepsParentIdentifier()
    {
        var parent = Location.Create("Garage");
        var child = Location.Create("Tool chest", parentLocationId: parent.Id);

        Assert.Equal(parent.Id, child.ParentLocationId);
    }

    [Fact]
    public void InternalComponentRequiresAParent()
    {
        var parent = Location.Create("Tool chest");
        var drawer = Location.Create("Top drawer", parentLocationId: parent.Id, isInternalComponent: true);

        Assert.True(drawer.IsInternalComponent);
        Assert.Throws<ArgumentException>(() => Location.Create("Loose drawer", isInternalComponent: true));
        Assert.Throws<ArgumentException>(() => drawer.MoveUnder(null));
    }

    [Fact]
    public void ItemRequiresANameAndALocation()
    {
        var location = Location.Create("Garage");

        Assert.Throws<ArgumentException>(() => Item.Create("Socket", Guid.Empty));
        Assert.Throws<ArgumentException>(() => Item.Create("  ", location.Id));
    }

    [Fact]
    public void ConsumableStatusIsClearedWhenAnItemIsNotConsumable()
    {
        var item = Item.Create("Cable", Location.Create("Garage").Id, isConsumable: true, consumableStatus: ConsumableStatus.Low);

        Assert.True(item.IsConsumable);
        Assert.Equal(ConsumableStatus.Low, item.ConsumableStatus);

        item.SetConsumable(false, ConsumableStatus.Out);

        Assert.False(item.IsConsumable);
        Assert.Null(item.ConsumableStatus);
    }

    [Fact]
    public void ItemCanMoveToAnotherLocation()
    {
        var first = Location.Create("Garage");
        var second = Location.Create("Loft");
        var item = Item.Create("Multimeter", first.Id);

        item.MoveTo(second.Id);

        Assert.Equal(second.Id, item.LocationId);
    }

    [Fact]
    public void CheckoutIsActiveUntilReturnedAndCannotBeReturnedTwice()
    {
        var checkedOutAt = new DateTime(2026, 9, 8, 10, 0, 0, DateTimeKind.Utc);
        var checkout = Checkout.Create(Guid.NewGuid(), "Sam", checkedOutAt: checkedOutAt);

        Assert.True(checkout.IsActive);
        checkout.Return(checkedOutAt.AddHours(2));

        Assert.False(checkout.IsActive);
        Assert.Equal(checkedOutAt.AddHours(2), checkout.ReturnedAt);
        Assert.Throws<InvalidOperationException>(() => checkout.Return());
    }

    [Fact]
    public void CheckoutRequiresBorrowerAndValidReturnTime()
    {
        var checkedOutAt = new DateTime(2026, 9, 8, 10, 0, 0, DateTimeKind.Utc);
        Assert.Throws<ArgumentException>(() => Checkout.Create(Guid.NewGuid(), " "));

        var checkout = Checkout.Create(Guid.NewGuid(), "Sam", checkedOutAt: checkedOutAt);
        Assert.Throws<ArgumentException>(() => checkout.Return(checkedOutAt.AddMinutes(-1)));
    }
}
