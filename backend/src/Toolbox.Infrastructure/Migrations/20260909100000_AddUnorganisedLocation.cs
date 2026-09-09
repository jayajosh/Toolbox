using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Toolbox.Infrastructure.Persistence;

#nullable disable

namespace Toolbox.Infrastructure.Migrations
{
    [DbContext(typeof(ToolboxDbContext))]
    [Migration("20260909100000_AddUnorganisedLocation")]
    public partial class AddUnorganisedLocation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO locations ("Id", "Name", "Description", "ParentLocationId", "LocationType", "CreatedAt", "UpdatedAt")
                VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Unorganised', 'Items that have not been assigned a permanent home.', NULL, 'System', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT ("Id") DO NOTHING;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM locations
                WHERE "Id" = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
                """);
        }
    }
}
