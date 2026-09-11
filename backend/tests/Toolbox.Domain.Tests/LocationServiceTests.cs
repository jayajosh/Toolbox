using Toolbox.Application.Locations;
using Toolbox.Domain.Entities;

namespace Toolbox.Domain.Tests;

public sealed class LocationServiceTests
{
    [Fact]
    public async Task CreateAllowsNestedLocations()
    {
        var repository = new FakeLocationRepository();
        var service = new LocationService(repository);
        var root = await service.CreateAsync(new CreateLocationCommand("House", null, null, "Building"), CancellationToken.None);

        var child = await service.CreateAsync(
            new CreateLocationCommand("Garage", null, root.Id, "Room"),
            CancellationToken.None);

        Assert.Equal(root.Id, child.ParentLocationId);
        Assert.Equal(2, repository.Locations.Count);
    }

    [Fact]
    public async Task CreateAndUpdatePersistInternalComponentClassification()
    {
        var repository = new FakeLocationRepository();
        var service = new LocationService(repository);
        var cabinet = await service.CreateAsync(new CreateLocationCommand("Cabinet", null, null, "Cabinet"), CancellationToken.None);

        var shelf = await service.CreateAsync(
            new CreateLocationCommand("Top shelf", null, cabinet.Id, "Shelf", IsInternalComponent: true),
            CancellationToken.None);

        Assert.True(shelf.IsInternalComponent);
        var updated = await service.UpdateAsync(
            shelf.Id,
            new UpdateLocationCommand("Top shelf", null, cabinet.Id, "Shelf", IsInternalComponent: false),
            CancellationToken.None);
        Assert.False(updated.IsInternalComponent);
    }

    [Fact]
    public async Task UpdateRejectsMovingLocationUnderItsDescendant()
    {
        var repository = new FakeLocationRepository();
        var service = new LocationService(repository);
        var root = await service.CreateAsync(new CreateLocationCommand("House", null, null, "Building"), CancellationToken.None);
        var child = await service.CreateAsync(new CreateLocationCommand("Garage", null, root.Id, "Room"), CancellationToken.None);

        var error = await Assert.ThrowsAsync<LocationConflictException>(() => service.UpdateAsync(
            root.Id,
            new UpdateLocationCommand("House", null, child.Id, "Building"),
            CancellationToken.None));
        Assert.Equal("A storage container cannot be moved under itself or one of its descendants.", error.Message);
    }

    [Fact]
    public async Task DeleteRemovesChildrenAndMovesTheirItemsToUnorganised()
    {
        var repository = new FakeLocationRepository();
        var service = new LocationService(repository);
        var root = await service.CreateAsync(new CreateLocationCommand("House", null, null, "Building"), CancellationToken.None);
        var child = await service.CreateAsync(new CreateLocationCommand("Garage", null, root.Id, "Room"), CancellationToken.None);
        var unorganised = Location.Create("Unorganised", id: Location.UnorganisedId, locationType: "System");
        var childEntity = repository.Locations.Single(location => location.Id == child.Id);
        var item = Item.Create("Hammer", child.Id);
        childEntity.Items.Add(item);
        await repository.AddAsync(unorganised, CancellationToken.None);

        await service.DeleteAsync(root.Id, CancellationToken.None);

        Assert.Equal(Location.UnorganisedId, item.LocationId);
        Assert.DoesNotContain(repository.Locations, location => location.Id == root.Id);
        Assert.DoesNotContain(repository.Locations, location => location.Id == child.Id);
    }

    [Fact]
    public async Task DeleteMovesContainedItemsToUnorganised()
    {
        var repository = new FakeLocationRepository();
        var unorganised = Location.Create("Unorganised", id: Location.UnorganisedId, locationType: "System");
        var shelf = Location.Create("Shelf");
        var item = Item.Create("Hammer", shelf.Id);
        shelf.Items.Add(item);
        await repository.AddAsync(unorganised, CancellationToken.None);
        await repository.AddAsync(shelf, CancellationToken.None);
        var service = new LocationService(repository);

        await service.DeleteAsync(shelf.Id, CancellationToken.None);

        Assert.Equal(Location.UnorganisedId, item.LocationId);
        Assert.DoesNotContain(shelf, repository.Locations);
    }

    [Fact]
    public async Task UnorganisedSystemLocationCannotBeChangedOrDeleted()
    {
        var repository = new FakeLocationRepository();
        var location = Location.Create("Unorganised", id: Location.UnorganisedId, locationType: "System");
        await repository.AddAsync(location, CancellationToken.None);
        var service = new LocationService(repository);

        await Assert.ThrowsAsync<LocationConflictException>(() => service.UpdateAsync(
            location.Id,
            new UpdateLocationCommand("Renamed", null, null, "Other"),
            CancellationToken.None));
        await Assert.ThrowsAsync<LocationConflictException>(() => service.DeleteAsync(location.Id, CancellationToken.None));
    }

    private sealed class FakeLocationRepository : ILocationRepository
    {
        public List<Location> Locations { get; } = [];

        public Task<IReadOnlyList<Location>> ListAsync(CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<Location>>(Locations.ToArray());

        public Task<Location?> GetAsync(Guid id, bool includeContents, CancellationToken cancellationToken) =>
            Task.FromResult(Locations.SingleOrDefault(location => location.Id == id));

        public Task AddAsync(Location location, CancellationToken cancellationToken)
        {
            Locations.Add(location);
            if (location.ParentLocationId is { } parentId
                && Locations.SingleOrDefault(parent => parent.Id == parentId) is { } parent)
            {
                parent.Children.Add(location);
            }

            return Task.CompletedTask;
        }

        public void Remove(Location location)
        {
            Locations.Remove(location);
            if (location.ParentLocationId is { } parentId
                && Locations.SingleOrDefault(parent => parent.Id == parentId) is { } parent)
            {
                parent.Children.Remove(location);
            }
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
