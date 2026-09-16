package repo

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/samber/lo"
	"github.com/sysadminsmedia/homebox/backend/internal/core/services/reporting/eventbus"
	"github.com/sysadminsmedia/homebox/backend/internal/data/ent"
	"github.com/sysadminsmedia/homebox/backend/internal/data/ent/entitytemplate"
	"github.com/sysadminsmedia/homebox/backend/internal/data/ent/group"
	"github.com/sysadminsmedia/homebox/backend/internal/data/ent/tag"
	"github.com/sysadminsmedia/homebox/backend/internal/data/ent/templatefield"
)

type EntityTemplatesRepository struct {
	db  *ent.Client
	bus *eventbus.EventBus
}

type (
	TemplateField struct {
		ID           *uuid.UUID `json:"id,omitempty"`
		Type         string     `json:"type"`
		Name         string     `json:"name"`
		TextValue    string     `json:"textValue"`
		NumberValue  int        `json:"numberValue"`
		BooleanValue bool       `json:"booleanValue"`
		TimeValue    time.Time  `json:"timeValue"`
	}

	TemplateTagSummary struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	}

	TemplateLocationSummary struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	}

	EntityTemplateCreate struct {
		DefaultQuantity        *float64     `json:"defaultQuantity,omitempty" extensions:"x-nullable"`
		DefaultName            *string      `json:"defaultName,omitempty" validate:"omitempty,max=255" extensions:"x-nullable"`
		DefaultDescription     *string      `json:"defaultDescription,omitempty" validate:"omitempty,max=1000" extensions:"x-nullable"`
		DefaultManufacturer    *string      `json:"defaultManufacturer,omitempty" validate:"omitempty,max=255" extensions:"x-nullable"`
		DefaultModelNumber     *string      `json:"defaultModelNumber,omitempty" validate:"omitempty,max=255" extensions:"x-nullable"`
		DefaultWarrantyDetails *string      `json:"defaultWarrantyDetails,omitempty" validate:"omitempty,max=1000" extensions:"x-nullable"`
		DefaultTagIDs          *[]uuid.UUID `json:"defaultTagIds,omitempty" extensions:"x-nullable"`
		Name                   string       `json:"name" validate:"required,min=1,max=255"`
		Description            string       `json:"description" validate:"max=1000"`
		Notes                  string       `json:"notes" validate:"max=1000"`
		Fields                 []TemplateField `json:"fields"`
		DefaultLocationID       uuid.UUID `json:"defaultLocationId,omitempty" extensions:"x-nullable"`
		DefaultInsured          bool      `json:"defaultInsured"`
		DefaultLifetimeWarranty bool      `json:"defaultLifetimeWarranty"`
		IncludeWarrantyFields bool `json:"includeWarrantyFields"`
		IncludePurchaseFields bool `json:"includePurchaseFields"`
		IncludeSoldFields     bool `json:"includeSoldFields"`
	}

	EntityTemplateUpdate struct {
		DefaultQuantity        *float64     `json:"defaultQuantity,omitempty" extensions:"x-nullable"`
		DefaultName            *string      `json:"defaultName,omitempty" validate:"omitempty,max=255" extensions:"x-nullable"`
		DefaultDescription     *string      `json:"defaultDescription,omitempty" validate:"omitempty,max=1000" extensions:"x-nullable"`
		DefaultManufacturer    *string      `json:"defaultManufacturer,omitempty" validate:"omitempty,max=255" extensions:"x-nullable"`
		DefaultModelNumber     *string      `json:"defaultModelNumber,omitempty" validate:"omitempty,max=255" extensions:"x-nullable"`
		DefaultWarrantyDetails *string      `json:"defaultWarrantyDetails,omitempty" validate:"omitempty,max=1000" extensions:"x-nullable"`
		DefaultTagIDs          *[]uuid.UUID `json:"defaultTagIds,omitempty" extensions:"x-nullable"`
		Name                   string       `json:"name" validate:"required,min=1,max=255"`
		Description            string       `json:"description" validate:"max=1000"`
		Notes                  string       `json:"notes" validate:"max=1000"`
		Fields                 []TemplateField `json:"fields"`
		ID                     uuid.UUID       `json:"id"`
		DefaultLocationID       uuid.UUID `json:"defaultLocationId,omitempty" extensions:"x-nullable"`
		DefaultInsured          bool      `json:"defaultInsured"`
		DefaultLifetimeWarranty bool      `json:"defaultLifetimeWarranty"`
		IncludeWarrantyFields bool `json:"includeWarrantyFields"`
		IncludePurchaseFields bool `json:"includePurchaseFields"`
		IncludeSoldFields     bool `json:"includeSoldFields"`
	}

	EntityTemplateSummary struct {
		ID                 uuid.UUID `json:"id"`
		Name               string    `json:"name"`
		Description        string    `json:"description"`
		DefaultModelNumber string    `json:"defaultModelNumber"`
		CreatedAt          time.Time `json:"createdAt"`
		UpdatedAt          time.Time `json:"updatedAt"`
	}

	EntityTemplateOut struct {
		CreatedAt time.Time `json:"createdAt"`
		UpdatedAt time.Time `json:"updatedAt"`
		DefaultLocation        *TemplateLocationSummary `json:"defaultLocation"`
		Name                   string                   `json:"name"`
		Description            string                   `json:"description"`
		Notes                  string                   `json:"notes"`
		DefaultName            string                   `json:"defaultName"`
		DefaultDescription     string                   `json:"defaultDescription"`
		DefaultManufacturer    string                   `json:"defaultManufacturer"`
		DefaultModelNumber     string                   `json:"defaultModelNumber"`
		DefaultWarrantyDetails string                   `json:"defaultWarrantyDetails"`
		DefaultTags            []TemplateTagSummary     `json:"defaultTags"`
		Fields                  []TemplateField          `json:"fields"`
		DefaultQuantity         float64   `json:"defaultQuantity"`
		ID                      uuid.UUID `json:"id"`
		DefaultInsured          bool      `json:"defaultInsured"`
		DefaultLifetimeWarranty bool      `json:"defaultLifetimeWarranty"`
		IncludeWarrantyFields bool `json:"includeWarrantyFields"`
		IncludePurchaseFields bool `json:"includePurchaseFields"`
		IncludeSoldFields     bool `json:"includeSoldFields"`
	}
)

func mapTemplateField(field *ent.TemplateField) TemplateField {
	return TemplateField{ID: lo.ToPtr(field.ID), Type: string(field.Type), Name: field.Name, TextValue: field.TextValue, NumberValue: field.NumberValue, BooleanValue: field.BooleanValue, TimeValue: field.TimeValue}
}

func mapTemplateFieldSlice(fields []*ent.TemplateField) []TemplateField {
	return lo.Map(fields, func(field *ent.TemplateField, _ int) TemplateField { return mapTemplateField(field) })
}

func mapEntityTemplateSummary(template *ent.EntityTemplate) EntityTemplateSummary {
	return EntityTemplateSummary{ID: template.ID, Name: template.Name, Description: template.Description, DefaultModelNumber: template.DefaultModelNumber, CreatedAt: template.CreatedAt, UpdatedAt: template.UpdatedAt}
}

func (r *EntityTemplatesRepository) mapTemplateOut(ctx context.Context, template *ent.EntityTemplate) EntityTemplateOut {
	fields := make([]TemplateField, 0)
	if template.Edges.Fields != nil { fields = mapTemplateFieldSlice(template.Edges.Fields) }
	var location *TemplateLocationSummary
	if template.Edges.Location != nil { location = &TemplateLocationSummary{ID: template.Edges.Location.ID, Name: template.Edges.Location.Name} }
	tags := make([]TemplateTagSummary, 0)
	if len(template.DefaultTagIds) > 0 {
		tagEntities, err := r.db.Tag.Query().Where(tag.IDIn(template.DefaultTagIds...)).All(ctx)
		if err == nil { tags = lo.Map(tagEntities, func(l *ent.Tag, _ int) TemplateTagSummary { return TemplateTagSummary{ID: l.ID, Name: l.Name} }) }
	}
	return EntityTemplateOut{ID: template.ID, Name: template.Name, Description: template.Description, Notes: template.Notes, CreatedAt: template.CreatedAt, UpdatedAt: template.UpdatedAt, DefaultQuantity: template.DefaultQuantity, DefaultInsured: template.DefaultInsured, DefaultName: template.DefaultName, DefaultDescription: template.DefaultDescription, DefaultManufacturer: template.DefaultManufacturer, DefaultModelNumber: template.DefaultModelNumber, DefaultLifetimeWarranty: template.DefaultLifetimeWarranty, DefaultWarrantyDetails: template.DefaultWarrantyDetails, DefaultLocation: location, DefaultTags: tags, IncludeWarrantyFields: template.IncludeWarrantyFields, IncludePurchaseFields: template.IncludePurchaseFields, IncludeSoldFields: template.IncludeSoldFields, Fields: fields}
}

func (r *EntityTemplatesRepository) publishMutationEvent(gid uuid.UUID) {
	if r.bus != nil { r.bus.Publish(eventbus.EventEntityMutation, eventbus.GroupMutationEvent{GID: gid}) }
}

// GetAll returns the global template catalog. The gid is intentionally kept in the
// signature because callers are collection-scoped, but visibility is global.
func (r *EntityTemplatesRepository) GetAll(ctx context.Context, gid uuid.UUID) ([]EntityTemplateSummary, error) {
	_ = gid
	templates, err := r.db.EntityTemplate.Query().Order(ent.Asc(entitytemplate.FieldName)).All(ctx)
	if err != nil { return nil, err }
	return lo.Map(templates, func(template *ent.EntityTemplate, _ int) EntityTemplateSummary { return mapEntityTemplateSummary(template) }), nil
}

// GetOne permits using a template from any collection. Update and Delete remain
// collection-scoped, so only the collection of origin can modify the template.
func (r *EntityTemplatesRepository) GetOne(ctx context.Context, gid uuid.UUID, id uuid.UUID) (EntityTemplateOut, error) {
	_ = gid
	template, err := r.db.EntityTemplate.Query().Where(entitytemplate.ID(id)).WithFields().WithLocation().Only(ctx)
	if err != nil { return EntityTemplateOut{}, err }
	return r.mapTemplateOut(ctx, template), nil
}

func (r *EntityTemplatesRepository) Create(ctx context.Context, gid uuid.UUID, data EntityTemplateCreate) (EntityTemplateOut, error) {
	if err := assertEntityInGroup(ctx, r.db.Entity, gid, data.DefaultLocationID); err != nil { return EntityTemplateOut{}, err }
	q := r.db.EntityTemplate.Create().SetName(data.Name).SetDescription(data.Description).SetNotes(data.Notes).SetNillableDefaultQuantity(data.DefaultQuantity).SetDefaultInsured(data.DefaultInsured).SetNillableDefaultName(data.DefaultName).SetNillableDefaultDescription(data.DefaultDescription).SetNillableDefaultManufacturer(data.DefaultManufacturer).SetNillableDefaultModelNumber(data.DefaultModelNumber).SetDefaultLifetimeWarranty(data.DefaultLifetimeWarranty).SetNillableDefaultWarrantyDetails(data.DefaultWarrantyDetails).SetIncludeWarrantyFields(data.IncludeWarrantyFields).SetIncludePurchaseFields(data.IncludePurchaseFields).SetIncludeSoldFields(data.IncludeSoldFields).SetGroupID(gid)
	if data.DefaultLocationID != uuid.Nil { q.SetLocationID(data.DefaultLocationID) }
	if data.DefaultTagIDs != nil && len(*data.DefaultTagIDs) > 0 { q.SetDefaultTagIds(*data.DefaultTagIDs) }
	template, err := q.Save(ctx)
	if err != nil { return EntityTemplateOut{}, err }
	for _, field := range data.Fields {
		_, err = r.db.TemplateField.Create().SetEntityTemplateID(template.ID).SetType(templatefield.Type(field.Type)).SetName(field.Name).SetTextValue(field.TextValue).Save(ctx)
		if err != nil { log.Err(err).Msg("failed to create template field"); return EntityTemplateOut{}, err }
	}
	r.publishMutationEvent(gid)
	return r.GetOne(ctx, gid, template.ID)
}

func (r *EntityTemplatesRepository) Update(ctx context.Context, gid uuid.UUID, data EntityTemplateUpdate) (EntityTemplateOut, error) {
	if err := assertEntityInGroup(ctx, r.db.Entity, gid, data.DefaultLocationID); err != nil { return EntityTemplateOut{}, err }
	template, err := r.db.EntityTemplate.Query().Where(entitytemplate.ID(data.ID), entitytemplate.HasGroupWith(group.ID(gid))).Only(ctx)
	if err != nil { return EntityTemplateOut{}, err }
	updateQ := template.Update().SetName(data.Name).SetDescription(data.Description).SetNotes(data.Notes).SetNillableDefaultQuantity(data.DefaultQuantity).SetDefaultInsured(data.DefaultInsured).SetNillableDefaultName(data.DefaultName).SetNillableDefaultDescription(data.DefaultDescription).SetNillableDefaultManufacturer(data.DefaultManufacturer).SetNillableDefaultModelNumber(data.DefaultModelNumber).SetDefaultLifetimeWarranty(data.DefaultLifetimeWarranty).SetNillableDefaultWarrantyDetails(data.DefaultWarrantyDetails).SetIncludeWarrantyFields(data.IncludeWarrantyFields).SetIncludePurchaseFields(data.IncludePurchaseFields).SetIncludeSoldFields(data.IncludeSoldFields)
	if data.DefaultLocationID != uuid.Nil { updateQ.SetLocationID(data.DefaultLocationID) } else { updateQ.ClearLocation() }
	if data.DefaultTagIDs != nil && len(*data.DefaultTagIDs) > 0 { updateQ.SetDefaultTagIds(*data.DefaultTagIDs) } else { updateQ.ClearDefaultTagIds() }
	_, err = updateQ.Save(ctx)
	if err != nil { return EntityTemplateOut{}, err }
	existingFields, err := r.db.TemplateField.Query().Where(templatefield.HasEntityTemplateWith(entitytemplate.ID(data.ID))).All(ctx)
	if err != nil { return EntityTemplateOut{}, err }
	updatedFieldIDs := make(map[uuid.UUID]bool)
	for _, field := range data.Fields {
		if field.ID == nil || *field.ID == uuid.Nil {
			_, err = r.db.TemplateField.Create().SetEntityTemplateID(data.ID).SetType(templatefield.Type(field.Type)).SetName(field.Name).SetTextValue(field.TextValue).Save(ctx)
			if err != nil { log.Err(err).Msg("failed to create template field"); return EntityTemplateOut{}, err }
		} else {
			updatedFieldIDs[*field.ID] = true
			_, err = r.db.TemplateField.Update().Where(templatefield.ID(*field.ID), templatefield.HasEntityTemplateWith(entitytemplate.ID(data.ID))).SetType(templatefield.Type(field.Type)).SetName(field.Name).SetTextValue(field.TextValue).Save(ctx)
			if err != nil { log.Err(err).Msg("failed to update template field"); return EntityTemplateOut{}, err }
		}
	}
	for _, field := range existingFields {
		if !updatedFieldIDs[field.ID] {
			err = r.db.TemplateField.DeleteOne(field).Exec(ctx)
			if err != nil { log.Err(err).Msg("failed to delete template field") }
		}
	}
	r.publishMutationEvent(gid)
	return r.GetOne(ctx, gid, template.ID)
}

func (r *EntityTemplatesRepository) Delete(ctx context.Context, gid uuid.UUID, id uuid.UUID) error {
	_, err := r.db.EntityTemplate.Query().Where(entitytemplate.ID(id), entitytemplate.HasGroupWith(group.ID(gid))).Only(ctx)
	if err != nil { return err }
	err = r.db.EntityTemplate.DeleteOneID(id).Exec(ctx)
	if err != nil { return err }
	r.publishMutationEvent(gid)
	return nil
}
