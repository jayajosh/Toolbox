using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Toolbox.Domain.Entities;

namespace Toolbox.Infrastructure.Persistence.Configurations;

internal sealed class SpacePlanConfiguration : IEntityTypeConfiguration<SpacePlan>
{
    public void Configure(EntityTypeBuilder<SpacePlan> builder)
    {
        builder.ToTable("space_plans");
        builder.HasKey(plan => plan.Id);
        builder.Property(plan => plan.Id).ValueGeneratedNever();
        builder.Property(plan => plan.ElementsJson).HasColumnType("jsonb").IsRequired();
        builder.Property(plan => plan.MeasurementSettingsJson).HasColumnType("jsonb").IsRequired();
        builder.Property(plan => plan.UpdatedAt).HasColumnType("timestamp with time zone").IsRequired();
    }
}
