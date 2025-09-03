import { PostgrestError } from "@supabase/supabase-js";

export interface FriendlyError {
  title: string;
  description: string;
}

/**
 * Converte erros do Supabase em mensagens amigáveis para o usuário
 */
export function getSupabaseErrorMessage(error: PostgrestError | Error | any): FriendlyError {
  // Se não é um erro do PostgreSQL, retorna mensagem genérica
  if (!error?.code && !error?.message) {
    return {
      title: "Erro inesperado",
      description: "Ocorreu um erro inesperado. Tente novamente."
    };
  }

  const code = error.code;
  const message = error.message?.toLowerCase() || "";

  // Erros específicos do PostgreSQL/Supabase
  switch (code) {
    case "23505": // unique_violation
      if (message.includes("email")) {
        return {
          title: "Email já cadastrado",
          description: "Este email já está sendo usado por outro usuário."
        };
      }
      if (message.includes("nome") || message.includes("name")) {
        return {
          title: "Nome já existe",
          description: "Já existe um registro com este nome."
        };
      }
      return {
        title: "Dados duplicados",
        description: "Já existe um registro com estas informações."
      };

    case "23503": // foreign_key_violation
      if (message.includes("customer")) {
        return {
          title: "Cliente não encontrado",
          description: "O cliente selecionado não existe mais."
        };
      }
      if (message.includes("recipe")) {
        return {
          title: "Receita não encontrada", 
          description: "A receita selecionada não existe mais."
        };
      }
      if (message.includes("item")) {
        return {
          title: "Item não encontrado",
          description: "O item selecionado não existe mais."
        };
      }
      return {
        title: "Referência inválida",
        description: "Um dos dados selecionados não existe mais."
      };

    case "23514": // check_constraint_violation
      if (message.includes("price") || message.includes("cost")) {
        return {
          title: "Valor inválido",
          description: "O preço ou custo deve ser maior que zero."
        };
      }
      if (message.includes("date")) {
        return {
          title: "Data inválida",
          description: "A data informada não é válida."
        };
      }
      return {
        title: "Dados inválidos",
        description: "Alguns dados não atendem aos critérios necessários."
      };

    case "23502": // not_null_violation
      const field = extractFieldFromMessage(message);
      return {
        title: "Campo obrigatório",
        description: `O campo ${field} é obrigatório.`
      };

    case "42P01": // undefined_table
      return {
        title: "Erro de sistema",
        description: "Recurso temporariamente indisponível. Tente novamente."
      };

    case "42703": // undefined_column
      return {
        title: "Erro de sistema", 
        description: "Dados não puderam ser processados. Contacte o suporte."
      };

    case "P0001": // raised_exception (custom errors from functions)
      return {
        title: "Operação não permitida",
        description: error.message || "Esta operação não pode ser realizada."
      };
  }

  // Erros de autenticação
  if (message.includes("auth") || message.includes("authentication")) {
    return {
      title: "Erro de autenticação",
      description: "Você precisa estar logado para realizar esta ação."
    };
  }

  // Erros de permissão/RLS
  if (message.includes("policy") || message.includes("permission") || message.includes("rls")) {
    return {
      title: "Acesso negado",
      description: "Você não tem permissão para realizar esta ação."
    };
  }

  // Erros de rede/conectividade
  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return {
      title: "Erro de conexão",
      description: "Verifique sua conexão com a internet e tente novamente."
    };
  }

  // Erros genéricos por operação
  if (message.includes("insert")) {
    return {
      title: "Erro ao criar",
      description: "Não foi possível criar o registro. Verifique os dados e tente novamente."
    };
  }

  if (message.includes("update")) {
    return {
      title: "Erro ao atualizar",
      description: "Não foi possível atualizar o registro. Verifique os dados e tente novamente."
    };
  }

  if (message.includes("delete")) {
    return {
      title: "Erro ao excluir",
      description: "Não foi possível excluir o registro. Pode estar sendo usado em outro lugar."
    };
  }

  // Fallback para qualquer outro erro
  return {
    title: "Erro inesperado",
    description: "Ocorreu um erro inesperado. Tente novamente ou contacte o suporte."
  };
}

/**
 * Extrai o nome do campo de uma mensagem de erro
 */
function extractFieldFromMessage(message: string): string {
  const fieldMap: Record<string, string> = {
    "title": "título",
    "name": "nome", 
    "email": "email",
    "date": "data",
    "time": "horário",
    "price": "preço",
    "cost": "custo",
    "customer": "cliente",
    "location": "local",
    "description": "descrição",
    "numguests": "número de convidados",
    "duration": "duração"
  };

  for (const [key, value] of Object.entries(fieldMap)) {
    if (message.includes(key)) {
      return value;
    }
  }

  return "informado";
}

/**
 * Hook para usar mensagens de erro amigáveis com toast
 */
export function useSupabaseErrorHandler() {
  return {
    handleError: (error: any) => {
      const friendlyError = getSupabaseErrorMessage(error);
      return friendlyError;
    }
  };
}