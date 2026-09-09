using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;
using System.Text.Json.Serialization;
using Toolbox.Application.Items;
using Toolbox.Application.Locations;
using Toolbox.Application.Tags;
using Toolbox.Application.Families;
using Toolbox.Infrastructure;
using Toolbox.Infrastructure.Initialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddScoped<LocationService>();
builder.Services.AddScoped<ItemService>();
builder.Services.AddScoped<TagService>();
builder.Services.AddScoped<FamilyService>();
builder.Services.AddToolboxInfrastructure(builder.Configuration);
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:4173",
                "http://localhost:5174",
                "http://localhost:4174",
                "http://192.168.10.116",
                "http://192.168.10.116:3000",
                "http://192.168.10.116:5174",
                "http://192.168.10.116:4174")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

if (!builder.Environment.IsProduction())
{
    builder.Services.AddHostedService<DevelopmentDatabaseInitializer>();
}

var app = builder.Build();

app.UseCors("Frontend");

app.MapControllers();
app.MapGet("/api/health/live", () => Results.Text("Healthy", "text/plain"));
app.MapHealthChecks("/api/health/ready", new HealthCheckOptions
{
    ResultStatusCodes =
    {
        [HealthStatus.Healthy] = StatusCodes.Status200OK,
        [HealthStatus.Degraded] = StatusCodes.Status503ServiceUnavailable,
        [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable
    },
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "text/plain";
        await context.Response.WriteAsync(report.Status == HealthStatus.Healthy ? "Healthy" : "Unhealthy");
    }
});

app.Run();
