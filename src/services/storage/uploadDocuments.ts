// Update the import path below to the correct location of Attachment, for example:
import { Attachment, AttachmentInsert } from '@/types/supabase';
// Or create the file at src/types/Attachment.ts if it does not exist.
import { createClient } from '@/utils/supabase/client';

export async function uploadDocuments(files: File[]): Promise<AttachmentInsert[]> {
  const uploadPromises = files.map(async (file) => {
    try {
      // Crear una carpeta única para cada sesión de subida usando un timestamp
      //const timestamp = Date.now();
      const safeFileName = encodeURIComponent(file.name);
      const filePath = `${safeFileName}`;
      console.log('filePath:', filePath);

      
      const supabase = await createClient();
      
      // Subir el archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('attachments-docs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      // Obtener la URL pública del archivo subido
      //***SUBAPASE ENTREGA EL NOMBRE DE ARCHIVO CON UN 25 ANTES DEL ESPACIO  */

     
      const { data: { publicUrl } } = supabase.storage
        .from('attachments-docs')
        .getPublicUrl(filePath);
      console.log('url publica obtenida:', publicUrl);
      // Reemplazar %2520 por %20
      const correctedUrl = publicUrl.replace(/%2520/g, '%20');

      return {
       
        file_path: filePath,
        file_url: correctedUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        
      
        
      };
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      throw error;
    }
  });

  return Promise.all(uploadPromises);
}