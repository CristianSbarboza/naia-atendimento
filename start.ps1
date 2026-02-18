# start.ps1

# 1. Verifica se o Docker está rodando
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker não está rodando. Por favor, inicie o Docker Desktop e tente novamente."
        exit 1
    }
} catch {
    Write-Host "Erro: Docker não está acessível. Certifique-se de que o Docker esteja rodando."
    exit 1
}

# 2. Verifica se a rede "rede_geral" existe. Se não, cria-a.
$networkName = "rede_geral"
try {
    $existingNetwork = docker network ls --filter "name=$networkName" --format "{{.Name}}"
} catch {
    Write-Host "Erro ao verificar a rede Docker. Certifique-se de que o Docker esteja rodando."
    exit 1
}

if (-not ($existingNetwork -match $networkName)) {
    Write-Host "Rede '$networkName' não encontrada. Criando..."
    docker network create $networkName | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao criar a rede '$networkName'."
        exit 1
    }
} else {
    Write-Host "Rede '$networkName' já existe."
}

# 3. Verifica se o volume do Postgres já existe e avisa sobre incompatibilidade de versão
$volumeName = "postgres_data"
try {
    $volumeInspect = docker volume ls --filter "name=$volumeName" --format "{{.Name}}"
} catch {
    Write-Host "Erro ao verificar o volume '$volumeName'."
    exit 1
}

if ($volumeInspect -match $volumeName) {
    Write-Host "O volume '$volumeName' já existe. Se ele foi inicializado com uma versão anterior do PostgreSQL, pode haver problemas de compatibilidade."
    $response = Read-Host "Deseja remover o volume '$volumeName' para reinicializar o banco de dados? (S/N)"
    if ($response -match "^[sS]") {
        Write-Host "Removendo o volume '$volumeName'..."
        docker volume rm $volumeName | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Erro ao remover o volume '$volumeName'. Verifique manualmente."
            exit 1
        }
    } else {
        Write-Host "Continuando sem remover o volume. Se o volume for incompatível, o Postgres pode não iniciar corretamente."
    }
}

# 4. Solicita os valores sensíveis
$env:POSTGRES_PASSWORD     = Read-Host "Digite a nova senha do Postgres"
$env:PGADMIN_DEFAULT_EMAIL = Read-Host "Digite o novo e-mail para o pgAdmin"
$env:N8N_REDIS_PASSWORD    = Read-Host "Digite a senha para o Redis do n8n"

# 5. Sobe os containers via Docker Compose
Write-Host "Subindo os containers via Docker Compose..."
& docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao subir os containers. Tentando iniciar os containers existentes..."
    & docker-compose start
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falha ao iniciar os containers. Verifique o estado deles manualmente."
        exit 1
    }
}

# Aguarda alguns segundos para os containers subirem
Start-Sleep -Seconds 10

# 6. Exibe informações úteis no terminal
Write-Host "-------------------------------------------"
Write-Host "Serviços iniciados com sucesso!"
Write-Host ""
Write-Host "Evolution API: http://localhost:8080"
Write-Host "API KEY da Evolution: KFZOm3Hc3GSNWwHBywEm67xYgjN8xGTH"
Write-Host ""
Write-Host "n8n:         http://localhost:5678"
Write-Host ""
Write-Host "Redis utilizado pelo n8n:"
Write-Host "    Host: host.docker.internal"
Write-Host "    Porta: 6380"
Write-Host "    Usuário: default"
Write-Host "    Senha: $env:N8N_REDIS_PASSWORD"
Write-Host "-------------------------------------------"
