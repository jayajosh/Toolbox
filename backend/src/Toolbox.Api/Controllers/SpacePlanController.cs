using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Toolbox.Domain.Entities;
using Toolbox.Infrastructure.Persistence;

namespace Toolbox.Api.Controllers;

[ApiController]
[Route("api/space-plan")]
public sealed class SpacePlanController(ToolboxDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<SpacePlanResponse>> Get(CancellationToken cancellationToken)
    {
        var plan = await db.SpacePlans.AsNoTracking().SingleOrDefaultAsync(
            item => item.Id == SpacePlan.SingletonId, cancellationToken);
        return plan is null ? NotFound() : Ok(ToResponse(plan));
    }

    [HttpPut]
    public async Task<ActionResult<SpacePlanResponse>> Put(
        SpacePlanRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsArray(request.Elements) || !IsObject(request.MeasurementSettings))
            return BadRequest(new { error = "Plan elements and measurement settings have invalid shapes." });

        var elementsJson = request.Elements.GetRawText();
        var settingsJson = request.MeasurementSettings.GetRawText();
        if (elementsJson.Length > SpacePlan.JsonMaxLength || settingsJson.Length > SpacePlan.JsonMaxLength)
            return BadRequest(new { error = "Plan data exceeds the size limit." });

        var plan = await db.SpacePlans.SingleOrDefaultAsync(
            item => item.Id == SpacePlan.SingletonId, cancellationToken);
        if (plan is null)
            db.SpacePlans.Add(SpacePlan.Create(elementsJson, settingsJson));
        else
            plan.Update(elementsJson, settingsJson);

        await db.SaveChangesAsync(cancellationToken);
        plan ??= await db.SpacePlans.SingleAsync(item => item.Id == SpacePlan.SingletonId, cancellationToken);
        return Ok(ToResponse(plan));
    }

    private static bool IsArray(JsonElement value) => value.ValueKind == JsonValueKind.Array;
    private static bool IsObject(JsonElement value) => value.ValueKind == JsonValueKind.Object;

    private static SpacePlanResponse ToResponse(SpacePlan plan) => new(
        JsonSerializer.Deserialize<JsonElement>(plan.ElementsJson),
        JsonSerializer.Deserialize<JsonElement>(plan.MeasurementSettingsJson),
        plan.UpdatedAt);
}

public sealed record SpacePlanRequest(JsonElement Elements, JsonElement MeasurementSettings);
public sealed record SpacePlanResponse(JsonElement Elements, JsonElement MeasurementSettings, DateTime UpdatedAt);
