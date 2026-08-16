"use client"

import React, { useState, useEffect } from "react"
import { 
  Button, 
  Table, 
  Modal, 
  TextField, 
  Label, 
  Input 
} from "@heroui/react"
import { Plus, Edit2, Trash2, Loader2, AlertTriangle } from "lucide-react"

interface Category {
  id: number
  name: string
  slug: string
  created_at: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Form State
  const [formData, setFormData] = useState({ name: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("http://localhost:8000/api/categories")
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const url = editingId 
        ? `http://localhost:8000/api/categories/${editingId}`
        : "http://localhost:8000/api/categories"
        
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        throw new Error("Failed to save category")
      }

      await fetchCategories()
      close()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (close: () => void) => {
    if (!deleteId) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`http://localhost:8000/api/categories/${deleteId}`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error("Failed to delete category")
      
      await fetchCategories()
      close()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
      setDeleteId(null)
    }
  }

  const openEdit = (category: Category) => {
    setEditingId(category.id)
    setFormData({ name: category.name })
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData({ name: "" })
    setError("")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-default-900">Categories</h1>
          <p className="text-default-500">
            Manage your product categories.
          </p>
        </div>
        
        <Modal>
          <Modal.Trigger>
            <Button variant="primary" onPress={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </Modal.Trigger>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.Header>
                  <h3 className="text-lg font-semibold">{editingId ? "Edit Category" : "Add New Category"}</h3>
                </Modal.Header>
                <Modal.Body>
                  <form id="categoryForm" onSubmit={(e) => {
                    e.preventDefault()
                  }}>
                    <div className="space-y-4 py-2">
                      {error && <div className="text-danger text-sm">{error}</div>}
                      <TextField 
                        isRequired 
                        value={formData.name}
                        onChange={(val: string) => setFormData({ name: val })}
                        className="flex flex-col gap-1 w-full"
                      >
                        <Label>Category Name</Label>
                        <Input placeholder="e.g., Beverages" />
                      </TextField>
                    </div>
                  </form>
                </Modal.Body>
                <Modal.Footer>
                  <Modal.CloseTrigger>
                    <Button variant="tertiary">Cancel</Button>
                  </Modal.CloseTrigger>
                  <Modal.CloseTrigger>
                    <Button variant="primary" isPending={isSubmitting} onPress={(e: any) => {
                      handleSubmit(e as any, () => {})
                    }}>
                      Save Changes
                    </Button>
                  </Modal.CloseTrigger>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>

      <div className="bg-background rounded-lg border border-default-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table aria-label="Categories table" className="w-full">
            <Table.Header>
              <Table.Column>ID</Table.Column>
              <Table.Column>NAME</Table.Column>
              <Table.Column>SLUG</Table.Column>
              <Table.Column className="text-right">ACTIONS</Table.Column>
            </Table.Header>
            <Table.Body>
              {categories.map((category) => (
                <Table.Row key={category.id}>
                  <Table.Cell className="py-3 px-4">{category.id}</Table.Cell>
                  <Table.Cell className="py-3 px-4 font-medium">{category.name}</Table.Cell>
                  <Table.Cell className="py-3 px-4 text-default-500">{category.slug}</Table.Cell>
                  <Table.Cell className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Modal>
                        <Modal.Trigger>
                          <Button isIconOnly variant="tertiary" onPress={() => openEdit(category)}>
                            <Edit2 className="w-4 h-4 text-default-500" />
                          </Button>
                        </Modal.Trigger>
                        <Modal.Backdrop>
                          <Modal.Container>
                            <Modal.Dialog>
                              <Modal.Header><h3 className="text-lg font-semibold">Edit Category</h3></Modal.Header>
                              <Modal.Body>
                                <div className="flex flex-col gap-4 py-2">
                                  {error && <div className="text-danger text-sm">{error}</div>}
                                  <TextField 
                                    isRequired 
                                    value={formData.name}
                                    onChange={(val: string) => setFormData({ name: val })}
                                    className="flex flex-col gap-1 w-full"
                                  >
                                    <Label>Category Name</Label>
                                    <Input />
                                  </TextField>
                                </div>
                              </Modal.Body>
                              <Modal.Footer>
                                <Modal.CloseTrigger>
                                  <Button variant="tertiary">Cancel</Button>
                                </Modal.CloseTrigger>
                                <Modal.CloseTrigger>
                                  <Button variant="primary" isPending={isSubmitting} onPress={(e: any) => {
                                    handleSubmit(e as any, () => {})
                                  }}>
                                    Save Changes
                                  </Button>
                                </Modal.CloseTrigger>
                              </Modal.Footer>
                            </Modal.Dialog>
                          </Modal.Container>
                        </Modal.Backdrop>
                      </Modal>

                      <Modal>
                        <Modal.Trigger>
                          <Button isIconOnly variant="danger-soft" onPress={() => setDeleteId(category.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </Modal.Trigger>
                        <Modal.Backdrop>
                          <Modal.Container>
                            <Modal.Dialog>
                              <Modal.Header>
                                <div className="flex items-center gap-2 text-danger">
                                  <AlertTriangle className="w-5 h-5" />
                                  <h3 className="text-lg font-semibold">Delete Category</h3>
                                </div>
                              </Modal.Header>
                              <Modal.Body>
                                <p>Are you sure you want to delete the category <strong>{category.name}</strong>?</p>
                                <p className="text-sm text-default-500">This action cannot be undone.</p>
                              </Modal.Body>
                              <Modal.Footer>
                                <Modal.CloseTrigger>
                                  <Button variant="tertiary">Cancel</Button>
                                </Modal.CloseTrigger>
                                <Modal.CloseTrigger>
                                  <Button variant="danger" isPending={isSubmitting} onPress={() => handleDelete(() => {})}>
                                    Delete
                                  </Button>
                                </Modal.CloseTrigger>
                              </Modal.Footer>
                            </Modal.Dialog>
                          </Modal.Container>
                        </Modal.Backdrop>
                      </Modal>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
              {categories.length === 0 && (
                <Table.Row>
                  <Table.Cell className="py-8 text-center text-default-500">No categories found</Table.Cell>
                  <Table.Cell>{""}</Table.Cell>
                  <Table.Cell>{""}</Table.Cell>
                  <Table.Cell>{""}</Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        )}
      </div>
    </div>
  )
}
