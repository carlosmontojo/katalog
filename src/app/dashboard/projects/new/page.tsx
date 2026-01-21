'use client'

import { useActionState } from 'react'
import { createProject } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const initialState = {
    message: '',
    errors: {},
}

export default function NewProjectPage() {
    // @ts-ignore
    const [state, formAction, isPending] = useActionState(createProject, initialState)

    return (
        <div className="flex justify-center items-start pt-10">
            <Card className="w-[600px]">
                <CardHeader>
                    <CardTitle>Create New Project</CardTitle>
                    <CardDescription>Start a new catalog project.</CardDescription>
                </CardHeader>
                <form action={formAction}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input id="name" name="name" placeholder="Summer Collection 2025" required />
                            {state?.errors?.name && <p className="text-sm text-red-500">{state.errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea id="description" name="description" placeholder="A brief description of this catalog..." />
                        </div>
                        {state?.message && <p className="text-sm text-red-500">{state.message}</p>}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" asChild>
                            <Link href="/dashboard">Cancel</Link>
                        </Button>
                        <Button type="submit">Create Project</Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
