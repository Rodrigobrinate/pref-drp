export const ADMIN_IMPORT_ALLOWED_CPFS_ENV = "DEVELOPER_ACCESS_CPFS";

export const ADMIN_IMPORT_FIELD_ALIASES = {
  cpf: ["cpf", "documento", "nr_cpf"],
  nome: ["nome", "name", "servidor_nome"],
  matricula: ["matricula", "registration", "mat", "mat_servidor"],
  vinculo: ["vinculo", "tipo_vinculo", "role"],
  secretaria: ["secretaria", "department", "lotacao"],
  cargo: ["cargo", "job_title", "jobtitle", "funcao"],
  chefiaCpf: ["chefia_cpf", "manager_cpf", "cpf_chefia"],
} as const;

export const ADMIN_IMPORT_PREVIEW_LIMIT = 5;

export const ADMIN_IMPORT_SUPPORTED_FORMATS = [".xml", ".csv"] as const;
