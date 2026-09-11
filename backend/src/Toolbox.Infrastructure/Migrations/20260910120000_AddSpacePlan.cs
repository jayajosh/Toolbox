using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Toolbox.Infrastructure.Migrations;

public partial class AddSpacePlan : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "space_plans",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false),
                ElementsJson = table.Column<string>(type: "jsonb", nullable: false),
                MeasurementSettingsJson = table.Column<string>(type: "jsonb", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_space_plans", x => x.Id));
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable(name: "space_plans");
}
