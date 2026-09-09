using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Toolbox.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTagsAndFamilies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FamilyId",
                table: "items",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "item_families",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ParentFamilyId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_families", x => x.Id);
                    table.ForeignKey(
                        name: "FK_item_families_item_families_ParentFamilyId",
                        column: x => x.ParentFamilyId,
                        principalTable: "item_families",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "item_tags",
                columns: table => new
                {
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_tags", x => new { x.ItemId, x.TagId });
                    table.ForeignKey(
                        name: "FK_item_tags_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_item_tags_tags_TagId",
                        column: x => x.TagId,
                        principalTable: "tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_items_FamilyId",
                table: "items",
                column: "FamilyId");

            migrationBuilder.CreateIndex(
                name: "IX_item_families_ParentFamilyId",
                table: "item_families",
                column: "ParentFamilyId");

            migrationBuilder.CreateIndex(
                name: "IX_item_tags_TagId",
                table: "item_tags",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_tags_NormalizedName",
                table: "tags",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_items_item_families_FamilyId",
                table: "items",
                column: "FamilyId",
                principalTable: "item_families",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_items_item_families_FamilyId",
                table: "items");

            migrationBuilder.DropTable(
                name: "item_families");

            migrationBuilder.DropTable(
                name: "item_tags");

            migrationBuilder.DropTable(
                name: "tags");

            migrationBuilder.DropIndex(
                name: "IX_items_FamilyId",
                table: "items");

            migrationBuilder.DropColumn(
                name: "FamilyId",
                table: "items");
        }
    }
}
