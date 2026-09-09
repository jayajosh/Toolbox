using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence.Configurations;

internal sealed class ItemConfiguration : IEntityTypeConfiguration<Item>
{
    public void Configure(EntityTypeBuilder<Item> builder)
    {
        builder.ToTable("items");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id)
            .HasColumnType("uuid")
            .HasDefaultValueSql("gen_random_uuid()");
        builder.Property(item => item.Name)
            .HasMaxLength(Item.NameMaxLength)
            .IsRequired();
        builder.Property(item => item.LocationId).HasColumnType("uuid").IsRequired();
        builder.Property(item => item.FamilyId).HasColumnType("uuid");
        builder.Property(item => item.IsConsumable).IsRequired();
        builder.Property(item => item.ConsumableStatus)
            .HasConversion<string>()
            .HasMaxLength(20);
        builder.Property(item => item.CreatedAt)
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();
        builder.Property(item => item.UpdatedAt)
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.HasOne(item => item.Location)
            .WithMany(location => location.Items)
            .HasForeignKey(item => item.LocationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(item => item.Family)
            .WithMany(family => family.Items)
            .HasForeignKey(item => item.FamilyId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
