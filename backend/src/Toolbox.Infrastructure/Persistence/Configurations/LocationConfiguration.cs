using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence.Configurations;

internal sealed class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.ToTable("locations");
        builder.HasKey(location => location.Id);
        builder.Property(location => location.Id)
            .HasColumnType("uuid")
            .HasDefaultValueSql("gen_random_uuid()");
        builder.Property(location => location.Name)
            .HasMaxLength(Location.NameMaxLength)
            .IsRequired();
        builder.Property(location => location.Description)
            .HasMaxLength(Location.DescriptionMaxLength);
        builder.Property(location => location.LocationType)
            .HasMaxLength(Location.LocationTypeMaxLength)
            .HasDefaultValue(Location.DefaultLocationType)
            .IsRequired();
        builder.Property(location => location.IsInternalComponent)
            .HasDefaultValue(false)
            .IsRequired();
        builder.Property(location => location.Color)
            .HasMaxLength(Location.ColorMaxLength)
            .HasDefaultValue("#728a77")
            .IsRequired();
        builder.Property(location => location.ParentLocationId).HasColumnType("uuid");
        builder.Property(location => location.CreatedAt)
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();
        builder.Property(location => location.UpdatedAt)
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.HasOne(location => location.ParentLocation)
            .WithMany(location => location.Children)
            .HasForeignKey(location => location.ParentLocationId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
