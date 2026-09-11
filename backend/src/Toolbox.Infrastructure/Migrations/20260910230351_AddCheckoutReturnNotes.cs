using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Toolbox.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckoutReturnNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReturnedNotes",
                table: "checkouts",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReturnedNotes",
                table: "checkouts");
        }
    }
}
