import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .substring(0, 80);
}

export function getHTMLFromContent(content: any): string {
  try {
    // Eliminar el chequeo de string, siempre se espera un objeto JSON
    function renderNode(node: any): string {
      // Párrafos
      if (node.type === "paragraph") {
        if (!node.content) return "<p></p>";
        return `<p>${
          node.content
            .map((text: any) => {
              let textContent = text.text || "";
              if (text.marks) {
                text.marks.forEach((mark: any) => {
                  if (mark.type === "bold")
                    textContent = `<strong>${textContent}</strong>`;
                  if (mark.type === "italic")
                    textContent = `<em>${textContent}</em>`;
                  if (mark.type === "link") {
                    // Si no hay href, usar el texto como href (auto-link)
                    const href = mark.attrs && mark.attrs.href ? mark.attrs.href : text.text;
                    textContent = `<a href="${href}" style="text-decoration: underline;" target="_blank" rel="noopener noreferrer">${textContent}</a>`;
                  }
                });
              }
              return textContent;
            })
            .join("") || ""
        }</p>`;
      }
      // Encabezados
      if (node.type === "heading") {
        const level = node.attrs?.level || 1;
        if (!node.content) return `<h${level}></h${level}>`;
        return `<h${level}>${
          node.content.map((text: any) => text.text || "").join("") || ""
        }</h${level}>`;
      }
      // Listas desordenadas (con viñetas)
      if (node.type === "bulletList") {
        if (!node.content) return "<ul></ul>";
        return `<ul class="list-disc ml-4">${
          node.content
            .map((listItem: any) => renderNode(listItem))
            .join("") || ""
        }</ul>`;
      }
      // Listas ordenadas (numeradas)
      if (node.type === "orderedList") {
        if (!node.content) return "<ol></ol>";
        return `<ol class="list-decimal ml-4">${
          node.content
            .map((listItem: any) => renderNode(listItem))
            .join("") || ""
        }</ol>`;
      }
      // Elementos de lista
      if (node.type === "listItem") {
        if (!node.content) return "<li></li>";
        // Un listItem puede contener párrafos y/o otras listas anidadas
        return `<li>${
          node.content
            .map((child: any) => renderNode(child))
            .join("") || ""
        }</li>`;
      }
      // Blockquote
      if (node.type === "blockquote") {
        if (!node.content) return "<blockquote></blockquote>";
        return `<blockquote>${
          node.content.map((child: any) => renderNode(child)).join("") || ""
        }</blockquote>`;
      }
      // Otros tipos no manejados
      return "";
    }

    if (content && content.content) {
      return content.content.map((node: any) => renderNode(node)).join("");
    }
    if (content && typeof content === "object") {
      return JSON.stringify(content);
    }
    return "No hay contenido disponible";
  } catch (error: any) {
    console.error(
      "Error al parsear el contenido:",
      error.message || JSON.stringify(error)
    );
    return `Error al mostrar el contenido: ${
      error.message || "Error desconocido"
    }`;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
