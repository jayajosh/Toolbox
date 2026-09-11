namespace Toolbox.Domain.Entities;

public sealed class SpacePlan
{
    public const int SingletonId = 1;
    public const int JsonMaxLength = 2_000_000;

    private SpacePlan()
    {
        ElementsJson = null!;
        MeasurementSettingsJson = null!;
    }

    private SpacePlan(string elementsJson, string measurementSettingsJson, DateTime updatedAt)
    {
        Id = SingletonId;
        ElementsJson = ValidateJson(elementsJson, nameof(elementsJson));
        MeasurementSettingsJson = ValidateJson(measurementSettingsJson, nameof(measurementSettingsJson));
        UpdatedAt = updatedAt;
    }

    public int Id { get; private set; }
    public string ElementsJson { get; private set; }
    public string MeasurementSettingsJson { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public static SpacePlan Create(string elementsJson, string measurementSettingsJson) =>
        new(elementsJson, measurementSettingsJson, DateTime.UtcNow);

    public void Update(string elementsJson, string measurementSettingsJson)
    {
        ElementsJson = ValidateJson(elementsJson, nameof(elementsJson));
        MeasurementSettingsJson = ValidateJson(measurementSettingsJson, nameof(measurementSettingsJson));
        UpdatedAt = DateTime.UtcNow;
    }

    private static string ValidateJson(string value, string parameterName)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > JsonMaxLength)
            throw new ArgumentException("Plan data is required and must be within the size limit.", parameterName);
        return value;
    }
}
