namespace Toolbox.Domain.Entities;

internal static class Guard
{
    public static string Required(string? value, string parameterName, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new ArgumentException("A value is required.", parameterName);
        }

        if (trimmed.Length > maxLength)
        {
            throw new ArgumentException($"Value cannot exceed {maxLength} characters.", parameterName);
        }

        return trimmed;
    }

    public static string? Optional(string? value, string parameterName, int maxLength)
    {
        var trimmed = value?.Trim();
        if (trimmed is not null && trimmed.Length > maxLength)
        {
            throw new ArgumentException($"Value cannot exceed {maxLength} characters.", parameterName);
        }

        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    public static Guid Required(Guid value, string parameterName) =>
        value == Guid.Empty
            ? throw new ArgumentException("A non-empty identifier is required.", parameterName)
            : value;

    public static DateTime Utc(DateTime value, string parameterName)
    {
        if (value.Kind == DateTimeKind.Utc)
        {
            return value;
        }

        return value.Kind == DateTimeKind.Local
            ? value.ToUniversalTime()
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }
}
