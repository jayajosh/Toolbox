using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Toolbox.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveQuantityAddConsumableStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_items_Quantity_Positive",
                table: "items");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "items");

            migrationBuilder.AddColumn<string>(
                name: "ConsumableStatus",
                table: "items",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsConsumable",
                table: "items",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConsumableStatus",
                table: "items");

            migrationBuilder.DropColumn(
                name: "IsConsumable",
                table: "items");

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "items",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "CK_items_Quantity_Positive",
                table: "items",
                sql: "\"Quantity\" > 0");
        }
    }
}
