using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence.Configurations;

internal sealed class ItemFamilyConfiguration : IEntityTypeConfiguration<ItemFamily>
{
    public void Configure(EntityTypeBuilder<ItemFamily> builder)
    {
        builder.ToTable("item_families");
        builder.HasKey(family => family.Id);
        builder.Property(family => family.Id)
            .HasColumnType("uuid")
            .HasDefaultValueSql("gen_random_uuid()");
        builder.Property(family => family.Name)
            .HasMaxLength(ItemFamily.NameMaxLength)
            .IsRequired();
        builder.Property(family => family.Description)
            .HasMaxLength(ItemFamily.DescriptionMaxLength);
        builder.Property(family => family.ParentFamilyId).HasColumnType("uuid");
        builder.Property(family => family.CreatedAt)
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();
        builder.Property(family => family.UpdatedAt)
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.HasOne(family => family.ParentFamily)
            .WithMany(family => family.Children)
            .HasForeignKey(family => family.ParentFamilyId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
