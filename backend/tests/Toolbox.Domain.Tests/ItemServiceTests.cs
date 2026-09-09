using Toolbox.Application.Items;
using Toolbox.Application.Locations;
using Toolbox.Domain.Entities;

namespace Toolbox.Domain.Tests;

public sealed class ItemServiceTests
{
    [Fact]
    public async Task CreateBuildsAnArbitrarilyDeepLocationPath()
    {
        var locations = new FakeLocationRepository();
        var root = locations.Add(Location.Create("House"));
        var room = locations.Add(Location.Create("Garage", parentLocationId: root.Id));
        var shelf = locations.Add(Location.Create("Shelf", parentLocationId: room.Id));
        var repository = new FakeItemRepository();
        var service = new ItemService(repository, locations);

        var result = await service.CreateAsync(
            new CreateItemCommand("Torque wrench", shelf.Id),
            CancellationToken.None);

        Assert.Equal("House / Garage / Shelf", result.LocationPath);
        Assert.False(result.IsCheckedOut);
        Assert.Empty(result.CheckoutHistory);
    }

    [Fact]
    public async Task UpdateMovesItemAndSearchMatchesNameCaseInsensitively()
    {
        var locations = new FakeLocationRepository();
        var first = locations.Add(Location.Create("Garage"));
        var second = locations.Add(Location.Create("Loft"));
        var repository = new FakeItemRepository();
        var service = new ItemService(repository, locations);
        var item = await service.CreateAsync(
            new CreateItemCommand("Socket set", first.Id),
            CancellationToken.None);

        var searchResults = await service.ListAsync("SOCKET", CancellationToken.None);
        var moved = await service.UpdateAsync(
            item.Id,
            new UpdateItemCommand("Socket set", second.Id),
            CancellationToken.None);

        Assert.Single(searchResults);
        Assert.Equal(second.Id, moved.LocationId);
        Assert.Equal("Loft", moved.LocationPath);
    }

    [Fact]
    public async Task CreateRejectsAnUnknownLocation()
    {
        var locations = new FakeLocationRepository();
        var service = new ItemService(new FakeItemRepository(), locations);

        await Assert.ThrowsAsync<LocationNotFoundException>(() => service.CreateAsync(
            new CreateItemCommand("Socket", Guid.NewGuid()),
            CancellationToken.None));
    }

    [Fact]
    public async Task QuickAddCreatesOneItemForEachNumberAndExpandsTheNamePattern()
    {
        var locations = new FakeLocationRepository();
        var location = locations.Add(Location.Create("Workshop"));
        var repository = new FakeItemRepository();
        var service = new ItemService(repository, locations);

        var results = await service.QuickAddAsync(
            new QuickAddItemsCommand("mm 1/4\" sockets {n}", 10, 12, location.Id),
            CancellationToken.None);

        Assert.Equal(3, results.Count);
        Assert.Equal(["mm 1/4\" sockets 10", "mm 1/4\" sockets 11", "mm 1/4\" sockets 12"], results.Select(item => item.Name));
    }

    [Fact]
    public async Task QuickAddRejectsAReversedRange()
    {
        var locations = new FakeLocationRepository();
        var location = locations.Add(Location.Create("Workshop"));
        var service = new ItemService(new FakeItemRepository(), locations);

        await Assert.ThrowsAsync<ArgumentException>(() => service.QuickAddAsync(
            new QuickAddItemsCommand("Socket {n}", 24, 10, location.Id),
            CancellationToken.None));
    }

    [Fact]
    public async Task DetailsExposeActiveCheckoutAndPreventDeletingIt()
    {
        var locations = new FakeLocationRepository();
        var location = locations.Add(Location.Create("Garage"));
        var repository = new FakeItemRepository();
        var service = new ItemService(repository, locations);
        var item = await service.CreateAsync(
            new CreateItemCommand("Multimeter", location.Id),
            CancellationToken.None);
        repository.Items.Single().Checkouts.Add(Checkout.Create(item.Id, "Sam"));

        var details = await service.GetAsync(item.Id, CancellationToken.None);

        Assert.True(details.IsCheckedOut);
        Assert.NotNull(details.ActiveCheckout);
        Assert.Equal("Sam", details.ActiveCheckout!.BorrowerName);
        Assert.Single(details.CheckoutHistory);
        await Assert.ThrowsAsync<ItemConflictException>(() => service.DeleteAsync(item.Id, CancellationToken.None));
    }

    private sealed class FakeLocationRepository : ILocationRepository
    {
        public List<Location> Locations { get; } = [];

        public Location Add(Location location)
        {
            Locations.Add(location);
            if (location.ParentLocationId is { } parentId
                && Locations.SingleOrDefault(parent => parent.Id == parentId) is { } parent)
            {
                parent.Children.Add(location);
            }

            return location;
        }

        public Task<IReadOnlyList<Location>> ListAsync(CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<Location>>(Locations.ToArray());

        public Task<Location?> GetAsync(Guid id, bool includeContents, CancellationToken cancellationToken) =>
            Task.FromResult(Locations.SingleOrDefault(location => location.Id == id));

        public Task AddAsync(Location location, CancellationToken cancellationToken)
        {
            Add(location);
            return Task.CompletedTask;
        }

        public void Remove(Location location) => Locations.Remove(location);

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeItemRepository : IItemRepository
    {
        public List<Item> Items { get; } = [];

        public Task<IReadOnlyList<Item>> ListAsync(string? search, CancellationToken cancellationToken)
        {
            IEnumerable<Item> results = Items;
            if (!string.IsNullOrWhiteSpace(search))
            {
                results = results.Where(item => item.Name.Contains(search, StringComparison.OrdinalIgnoreCase));
            }

            return Task.FromResult<IReadOnlyList<Item>>(results.ToArray());
        }

        public Task<Item?> GetAsync(Guid id, bool includeCheckoutHistory, CancellationToken cancellationToken) =>
            Task.FromResult(Items.SingleOrDefault(item => item.Id == id));

        public Task AddAsync(Item item, CancellationToken cancellationToken)
        {
            Items.Add(item);
            return Task.CompletedTask;
        }

        public Task AddCheckoutAsync(Checkout checkout, CancellationToken cancellationToken)
        {
            var item = Items.Single(item => item.Id == checkout.ItemId);
            item.Checkouts.Add(checkout);
            return Task.CompletedTask;
        }

        public void Remove(Item item) => Items.Remove(item);

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
