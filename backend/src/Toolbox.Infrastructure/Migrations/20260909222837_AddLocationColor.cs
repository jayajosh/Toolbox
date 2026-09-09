using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Toolbox.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "locations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "#728a77");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Color",
                table: "locations");
        }
    }
}
