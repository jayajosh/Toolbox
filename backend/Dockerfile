FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Directory.Build.props", "."]
COPY ["src/Toolbox.Api/Toolbox.Api.csproj", "src/Toolbox.Api/"]
COPY ["src/Toolbox.Application/Toolbox.Application.csproj", "src/Toolbox.Application/"]
COPY ["src/Toolbox.Domain/Toolbox.Domain.csproj", "src/Toolbox.Domain/"]
COPY ["src/Toolbox.Infrastructure/Toolbox.Infrastructure.csproj", "src/Toolbox.Infrastructure/"]
RUN dotnet restore "src/Toolbox.Api/Toolbox.Api.csproj"

COPY . .
RUN dotnet publish "src/Toolbox.Api/Toolbox.Api.csproj" \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "Toolbox.Api.dll"]
