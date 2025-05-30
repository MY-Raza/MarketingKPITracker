import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SubcategoryFormProps {
  initialData: {
    id?: string;
    name: string;
    stageId: string;
    displayOrder: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  cvjStages: any[];
}

export function SubcategoryForm({ initialData, onSubmit, onCancel, cvjStages }: SubcategoryFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Subcategory name is required';
    }

    if (!formData.stageId) {
      newErrors.stageId = 'CVJ Stage is required';
    }

    if (!formData.displayOrder || isNaN(Number(formData.displayOrder)) || Number(formData.displayOrder) < 1) {
      newErrors.displayOrder = 'Display order must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = {
        ...formData,
        displayOrder: Number(formData.displayOrder),
        cvjStageId: formData.stageId
      };
      onSubmit(submitData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Subcategory Name</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter subcategory name"
          className={errors.name ? 'border-red-500' : ''}
          required
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <Label htmlFor="stageId">CVJ Stage</Label>
        <Select
          value={formData.stageId}
          onValueChange={(value) => setFormData({ ...formData, stageId: value })}
        >
          <SelectTrigger className={errors.stageId ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select CVJ Stage" />
          </SelectTrigger>
          <SelectContent>
            {cvjStages.map(stage => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.stageId && (
          <p className="text-sm text-red-600 mt-1">{errors.stageId}</p>
        )}
      </div>

      <div>
        <Label htmlFor="displayOrder">Display Order</Label>
        <Input
          id="displayOrder"
          type="number"
          min="1"
          value={formData.displayOrder}
          onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
          placeholder="Enter display order"
          className={errors.displayOrder ? 'border-red-500' : ''}
          required
        />
        {errors.displayOrder && (
          <p className="text-sm text-red-600 mt-1">{errors.displayOrder}</p>
        )}
      </div>

      <div className="flex space-x-2 pt-4">
        <Button type="submit" className="flex-1">
          {initialData.id ? 'Update Subcategory' : 'Add Subcategory'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}