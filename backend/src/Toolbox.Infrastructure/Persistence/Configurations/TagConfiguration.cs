using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence.Configurations;

internal sealed class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.ToTable("tags");
        builder.HasKey(tag => tag.Id);
        builder.Property(tag => tag.Id)
            .HasColumnType("uuid")
            .HasDefaultValueSql("gen_random_uuid()");
        builder.Property(tag => tag.Name)
            .HasMaxLength(Tag.NameMaxLength)
            .IsRequired();
        builder.Property(tag => tag.NormalizedName)
            .HasMaxLength(Tag.NameMaxLength)
            .IsRequired();
        builder.Property(tag => tag.CreatedAt)
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();
        builder.Property(tag => tag.UpdatedAt)
            .HasColumnType("timestamp with time zone")
            .IsRequired();
        builder.HasIndex(tag => tag.NormalizedName).IsUnique();
    }
}
