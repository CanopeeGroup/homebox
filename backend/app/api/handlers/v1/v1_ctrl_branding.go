package v1

import (
	"encoding/base64"
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/hay-kot/httpkit/errchain"
	"github.com/hay-kot/httpkit/server"
	"github.com/sysadminsmedia/homebox/backend/internal/sys/validate"
)

type publicBranding struct {
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Avatar   string `json:"avatar"`
}

type brandingUpdate struct {
	Title    *string `json:"title"`
	Subtitle *string `json:"subtitle"`
	Avatar   *string `json:"avatar"`
}

func brandingFromSettings(settings map[string]interface{}) publicBranding {
	title, _ := settings["appTitle"].(string)
	subtitle, _ := settings["appSubtitle"].(string)
	avatar, _ := settings["adminAvatar"].(string)
	if !validBrandingAvatar(avatar) {
		avatar = ""
	}
	return publicBranding{Title: strings.TrimSpace(title), Subtitle: strings.TrimSpace(subtitle), Avatar: avatar}
}

func validBrandingAvatar(avatar string) bool {
	if avatar == "" {
		return true
	}
	if len(avatar) > 64*1024 {
		return false
	}
	header, payload, ok := strings.Cut(avatar, ",")
	if !ok {
		return false
	}
	var mime string
	switch header {
	case "data:image/webp;base64":
		mime = "image/webp"
	case "data:image/png;base64":
		mime = "image/png"
	default:
		return false
	}
	decoded, err := base64.StdEncoding.DecodeString(payload)
	return err == nil && http.DetectContentType(decoded) == mime
}

func (ctrl *V1Controller) HandleBrandingGet() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		settings, err := ctrl.repo.Users.GetBranding(r.Context())
		if err != nil {
			return validate.NewRequestError(err, http.StatusInternalServerError)
		}
		return server.JSON(w, http.StatusOK, brandingFromSettings(settings))
	}
}

func (ctrl *V1Controller) HandleBrandingUpdate() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		r.Body = http.MaxBytesReader(w, r.Body, 68*1024)
		var input brandingUpdate
		if err := server.Decode(r, &input); err != nil {
			return validate.NewRequestError(err, http.StatusBadRequest)
		}

		changes := make(map[string]string)
		for _, field := range []struct {
			key   string
			value *string
			limit int
		}{
			{"appTitle", input.Title, 60},
			{"appSubtitle", input.Subtitle, 160},
		} {
			if field.value == nil {
				continue
			}
			value := strings.TrimSpace(*field.value)
			if utf8.RuneCountInString(value) > field.limit {
				return validate.NewRequestError(errors.New("branding text is too long"), http.StatusBadRequest)
			}
			changes[field.key] = value
		}
		if input.Avatar != nil {
			if !validBrandingAvatar(*input.Avatar) {
				return validate.NewRequestError(errors.New("invalid branding image"), http.StatusBadRequest)
			}
			changes["adminAvatar"] = *input.Avatar
		}

		settings, err := ctrl.repo.Users.UpdateBranding(r.Context(), changes)
		if err != nil {
			return validate.NewRequestError(err, http.StatusInternalServerError)
		}
		return server.JSON(w, http.StatusOK, brandingFromSettings(settings))
	}
}
