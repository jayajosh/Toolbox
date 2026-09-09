using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence.Configurations;

internal sealed class ItemTagConfiguration : IEntityTypeConfiguration<ItemTag>
{
    public void Configure(EntityTypeBuilder<ItemTag> builder)
    {
        builder.ToTable("item_tags");
        builder.HasKey(itemTag => new { itemTag.ItemId, itemTag.TagId });
        builder.Property(itemTag => itemTag.ItemId).HasColumnType("uuid");
        builder.Property(itemTag => itemTag.TagId).HasColumnType("uuid");

        builder.HasOne(itemTag => itemTag.Item)
            .WithMany(item => item.ItemTags)
            .HasForeignKey(itemTag => itemTag.ItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(itemTag => itemTag.Tag)
            .WithMany(tag => tag.ItemTags)
            .HasForeignKey(itemTag => itemTag.TagId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
