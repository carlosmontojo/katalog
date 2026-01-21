'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const createProjectSchema = z.object({
    name: z.string().min(3, { message: "Name must be at least 3 characters" }),
    description: z.string().optional(),
})

export async function createProject(prevState: any, formData: FormData) {
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
        return { message: `Failed to create project: ${error.message}` }
    }

    revalidatePath('/dashboard')
    redirect('/dashboard')
}
