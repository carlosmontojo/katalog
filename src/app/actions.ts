'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const createProjectSchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
    description: z.string().optional(),
})

export async function createProject(prevState: { errors?: Record<string, string[]>; message?: string } | null, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const validatedFields = createProjectSchema.safeParse({
        name: formData.get('name'),
        description: formData.get('description'),
    })

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { error } = await supabase.from('projects').insert({
        name: validatedFields.data.name,
        description: validatedFields.data.description,
        user_id: user.id,
        template_id: 'basic', // Default template
        settings: {},
    })

    if (error) {
        console.error('Error creating project:', error)
        return { message: `Error al crear el proyecto: ${error.message}` }
    }

    revalidatePath('/dashboard')
    redirect('/dashboard')
}
