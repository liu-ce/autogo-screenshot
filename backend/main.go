// ADB截图工具后端API服务
package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"log"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

type Device struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Model  string `json:"model"`
}

type WebScreenshotTool struct {
	devices        []Device
	selectedDevice *Device
	currentImage   image.Image
	imageData      string // base64 encoded image
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

type ScreenshotRequest struct {
	DeviceID string `json:"deviceId"`
}

type SaveRequest struct {
	X1       int    `json:"x1"`
	Y1       int    `json:"y1"`
	X2       int    `json:"x2"`
	Y2       int    `json:"y2"`
	Format   string `json:"format"`
	Filename string `json:"filename"`
}

var tool = &WebScreenshotTool{}

func main() {
	// 启用CORS
	http.HandleFunc("/api/devices", corsMiddleware(devicesHandler))
	http.HandleFunc("/api/screenshot", corsMiddleware(screenshotHandler))
	http.HandleFunc("/api/save", corsMiddleware(saveHandler))

	// 提供静态文件服务
	http.Handle("/", http.FileServer(http.Dir("../frontend/")))

	fmt.Println("ADB截图工具后端API启动在 http://localhost:8083")
	fmt.Println("前端页面访问: http://localhost:8083")
	log.Fatal(http.ListenAndServe(":8083", nil))
}

// CORS中间件
func corsMiddleware(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 设置CORS头
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// 处理预检请求
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		handler(w, r)
	}
}

func devicesHandler(w http.ResponseWriter, r *http.Request) {
	devices, err := listDevices()
	if err != nil {
		sendError(w, "获取设备列表失败: "+err.Error())
		return
	}

	tool.devices = devices
	sendSuccess(w, devices)
}

func screenshotHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		sendError(w, "只支持POST请求")
		return
	}

	var req ScreenshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "请求格式错误")
		return
	}

	// 找到选中的设备
	var selectedDevice *Device
	for _, device := range tool.devices {
		if device.ID == req.DeviceID {
			selectedDevice = &device
			break
		}
	}

	if selectedDevice == nil {
		sendError(w, "设备未找到")
		return
	}

	tool.selectedDevice = selectedDevice

	// 执行截图
	cmd := exec.Command("adb", "-s", selectedDevice.ID, "exec-out", "screencap", "-p")
	output, err := cmd.Output()
	if err != nil {
		sendError(w, "截图失败: "+err.Error())
		return
	}

	// 解码图片
	img, err := png.Decode(bytes.NewReader(output))
	if err != nil {
		sendError(w, "图片解码失败: "+err.Error())
		return
	}

	tool.currentImage = img

	// 编码为base64
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		sendError(w, "图片编码失败: "+err.Error())
		return
	}

	imageData := base64.StdEncoding.EncodeToString(buf.Bytes())
	tool.imageData = imageData

	sendSuccess(w, map[string]string{
		"image": imageData,
	})
}

func saveHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		sendError(w, "只支持POST请求")
		return
	}

	var req SaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "请求格式错误")
		return
	}

	if tool.currentImage == nil {
		sendError(w, "请先截图")
		return
	}

	// 验证文件名
	if req.Filename == "" {
		req.Filename = fmt.Sprintf("截图_%s", time.Now().Format("20060102_150405"))
	}

	// 裁剪图片
	bounds := tool.currentImage.Bounds()
	if req.X1 < 0 || req.Y1 < 0 || req.X2 > bounds.Dx() || req.Y2 > bounds.Dy() {
		sendError(w, "坐标超出范围")
		return
	}

	rect := image.Rect(req.X1, req.Y1, req.X2, req.Y2)
	subImg := tool.currentImage.(interface {
		SubImage(r image.Rectangle) image.Image
	}).SubImage(rect)

	// 设置响应头
	filename := fmt.Sprintf("%s.%s", req.Filename, req.Format)
	w.Header().Set("Content-Disposition", "attachment; filename="+filename)

	if req.Format == "jpg" {
		w.Header().Set("Content-Type", "image/jpeg")
		jpeg.Encode(w, subImg, &jpeg.Options{Quality: 95})
	} else {
		w.Header().Set("Content-Type", "image/png")
		png.Encode(w, subImg)
	}
}

func listDevices() ([]Device, error) {
	cmd := exec.Command("adb", "devices", "-l")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(string(output), "\n")
	var devices []Device

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "List of devices") || strings.HasPrefix(line, "*") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) >= 2 {
			device := Device{
				ID:     parts[0],
				Status: parts[1],
			}

			// Extract model info if available
			for _, part := range parts[2:] {
				if strings.HasPrefix(part, "model:") {
					device.Model = strings.TrimPrefix(part, "model:")
					break
				}
			}

			// Only include devices that are online/device status
			if device.Status == "device" {
				devices = append(devices, device)
			}
		}
	}

	return devices, nil
}

func sendSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    data,
	})
}

func sendError(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(APIResponse{
		Success: false,
		Message: message,
	})
}
