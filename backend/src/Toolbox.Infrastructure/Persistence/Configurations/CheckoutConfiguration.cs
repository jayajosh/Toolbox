using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence.Configurations;

internal sealed class CheckoutConfiguration : IEntityTypeConfiguration<Checkout>
{
    public void Configure(EntityTypeBuilder<Checkout> builder)
    {
        builder.ToTable("checkouts");
        builder.HasKey(checkout => checkout.Id);
        builder.Property(checkout => checkout.Id)
            .HasColumnType("uuid")
            .HasDefaultValueSql("gen_random_uuid()");
        builder.Property(checkout => checkout.ItemId).HasColumnType("uuid").IsRequired();
        builder.Property(checkout => checkout.CheckedOutAt)
            .HasColumnType("timestamp with time zone")
            .IsRequired();
        builder.Property(checkout => checkout.ReturnedAt)
            .HasColumnType("timestamp with time zone");
        builder.Property(checkout => checkout.BorrowerName)
            .HasMaxLength(Checkout.BorrowerNameMaxLength)
            .IsRequired();
        builder.Property(checkout => checkout.Notes).HasMaxLength(Checkout.NotesMaxLength);
        builder.Property(checkout => checkout.ReturnedNotes).HasMaxLength(Checkout.NotesMaxLength);

        builder.HasOne(checkout => checkout.Item)
            .WithMany(item => item.Checkouts)
            .HasForeignKey(checkout => checkout.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(checkout => checkout.ItemId)
            .HasDatabaseName("IX_checkouts_ItemId_active")
            .IsUnique()
            .HasFilter("\"ReturnedAt\" IS NULL");
    }
}
