using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Toolbox.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveItemDescriptionAndPhoto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "items");

            migrationBuilder.DropColumn(
                name: "PhotoUrl",
                table: "items");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "items",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhotoUrl",
                table: "items",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);
        }
    }
}
