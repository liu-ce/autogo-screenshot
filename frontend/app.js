// ADB截图工具前端JavaScript

// API基础地址 - 可以配置为不同的后端地址
const API_BASE = 'http://localhost:8083';

let currentImage = null;
let selection = { x1: 0, y1: 0, x2: 0, y2: 0 };
let isSelecting = false;
let selectionBox = null;
let colorPickerMode = false;
let selectedColorSlot = -1;
let colorSlots = [];
let magnifierCanvas = null;
let magnifierCtx = null;
let multipointMode = false;
let multipoints = [];

window.onload = function() {
    refreshDevices();
    initColorPicker();
    updateMultipointDisplay();
    initCollapsibleSections();
};

// 收缩面板功能
function initCollapsibleSections() {
    // 默认收起所有面板
    const sections = ['multipoint', 'colorpicker'];
    sections.forEach(section => {
        const content = document.getElementById(section + 'Content');
        const icon = document.getElementById(section + 'Icon');
        if (content && icon) {
            content.classList.add('collapsed');
            content.style.maxHeight = '0';
            icon.classList.add('collapsed');
            icon.textContent = '▶';
        }
    });
}

function toggleSection(sectionName) {
    const content = document.getElementById(sectionName + 'Content');
    const icon = document.getElementById(sectionName + 'Icon');
    
    if (content.classList.contains('collapsed')) {
        // 展开
        content.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.classList.remove('collapsed');
        icon.textContent = '▼';
    } else {
        // 收缩
        content.classList.add('collapsed');
        content.style.maxHeight = '0';
        icon.classList.add('collapsed');
        icon.textContent = '▶';
    }
}

function initColorPicker() {
    magnifierCanvas = document.getElementById('magnifierCanvas');
    magnifierCtx = magnifierCanvas.getContext('2d');
    
    // 初始化6个取色框
    const colorSlotsContainer = document.getElementById('colorSlots');
    for (let i = 0; i < 6; i++) {
        const slot = document.createElement('div');
        slot.className = 'color-slot';
        slot.innerHTML = 
            '<div class="color-info">' +
                '<div class="color-preview" id="colorPreview' + i + '"></div>' +
                '<div class="color-value" id="colorValue' + i + '">点击取色</div>' +
            '</div>' +
            '<div class="color-coords" id="colorCoords' + i + '">坐标: 未设置</div>' +
            '<div class="color-buttons">' +
                '<button class="color-copy-btn" id="colorCopyBtn' + i + '" onclick="copyColor(' + i + ')" disabled>复制颜色</button>' +
                '<button class="color-copy-btn coord-btn" id="coordCopyBtn' + i + '" onclick="copyColorCoords(' + i + ')" disabled>复制坐标</button>' +
                '<button class="color-copy-btn" id="copyAllBtn' + i + '" onclick="copyColorAll(' + i + ')" disabled style="background: #27ae60;">一键复制</button>' +
            '</div>';
        
        slot.addEventListener('click', function() {
            selectColorSlot(i);
        });
        
        colorSlotsContainer.appendChild(slot);
        colorSlots.push({ color: null, coords: null, element: slot });
    }
}

function toggleColorPicker() {
    colorPickerMode = !colorPickerMode;
    const btn = document.getElementById('colorPickerBtn');
    
    if (colorPickerMode) {
        btn.textContent = '🎨 退出取色模式';
        btn.classList.add('active');
        showStatus('取色模式已启用，点击任意取色框后再点击图片上的点获取颜色', 'info');
    } else {
        btn.textContent = '🎨 启用取色模式';
        btn.classList.remove('active');
        selectedColorSlot = -1;
        updateColorSlotSelection();
        showStatus('取色模式已关闭', 'info');
    }
}

function selectColorSlot(index) {
    if (!colorPickerMode) return;
    
    selectedColorSlot = index;
    updateColorSlotSelection();
    showStatus('已选择取色框 ' + (index + 1) + '，现在点击图片上的点获取颜色', 'info');
}

function updateColorSlotSelection() {
    colorSlots.forEach((slot, index) => {
        if (index === selectedColorSlot) {
            slot.element.style.border = '2px solid #f39c12';
        } else {
            slot.element.style.border = '1px solid #34495e';
        }
    });
}

function copyColor(index) {
    const color = colorSlots[index].color;
    if (!color) return;
    
    const colorWithQuotes = '"' + color + '"';
    navigator.clipboard.writeText(colorWithQuotes).then(() => {
        showStatus('颜色 ' + colorWithQuotes + ' 已复制到剪贴板', 'success');
    }).catch(() => {
        showStatus('复制失败', 'error');
    });
}

function copyColorCoords(index) {
    const coords = colorSlots[index].coords;
    if (!coords) return;
    
    navigator.clipboard.writeText(coords).then(() => {
        showStatus('坐标 ' + coords + ' 已复制到剪贴板', 'success');
    }).catch(() => {
        showStatus('复制失败', 'error');
    });
}

function copyColorAll(index) {
    const color = colorSlots[index].color;
    const coords = colorSlots[index].coords;
    if (!color || !coords) return;
    
    const text = coords + ',"' + color + '"';
    navigator.clipboard.writeText(text).then(() => {
        showStatus('已复制: ' + text, 'success');
    }).catch(() => {
        showStatus('复制失败', 'error');
    });
}

async function refreshDevices() {
    try {
        const response = await fetch(API_BASE + '/api/devices');
        const result = await response.json();
        
        const select = document.getElementById('deviceSelect');
        select.innerHTML = '<option value="">选择设备...</option>';
        
        if (result.success && result.data) {
            result.data.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.model ? 
                    device.id + ' (' + device.model + ')' : device.id;
                select.appendChild(option);
            });
            
            if (result.data.length === 1) {
                select.value = result.data[0].id;
                onDeviceSelect();
            }
        } else {
            showStatus('获取设备列表失败: ' + (result.message || '未知错误'), 'error');
        }
    } catch (error) {
        showStatus('网络错误: ' + error.message, 'error');
    }
}

function onDeviceSelect() {
    const select = document.getElementById('deviceSelect');
    const screenshotBtn = document.getElementById('screenshotBtn');
    const deviceInfo = document.getElementById('deviceInfo');
    
    if (select.value) {
        screenshotBtn.disabled = false;
        deviceInfo.textContent = '已选择: ' + select.options[select.selectedIndex].text;
    } else {
        screenshotBtn.disabled = true;
        deviceInfo.textContent = '未选择设备';
    }
}

document.getElementById('deviceSelect').addEventListener('change', onDeviceSelect);

async function takeScreenshot() {
    const deviceId = document.getElementById('deviceSelect').value;
    if (!deviceId) {
        showStatus('请先选择设备', 'error');
        return;
    }
    
    showStatus('正在截图...', 'info');
    
    try {
        const response = await fetch(API_BASE + '/api/screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: deviceId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayImage(result.data.image);
            showStatus('截图成功', 'success');
        } else {
            showStatus('截图失败: ' + result.message, 'error');
        }
    } catch (error) {
        showStatus('截图错误: ' + error.message, 'error');
    }
}


function displayImage(imageData) {
    const container = document.getElementById('imageContainer');
    
    container.innerHTML = '';
    
    const img = document.createElement('img');
    img.className = 'screenshot-image';
    img.src = 'data:image/png;base64,' + imageData;
    
    img.onload = function() {
        const timestamp = new Date().toISOString().slice(0,19).replace(/[:-]/g, '');
        const defaultFilename = '截图_' + timestamp;
        document.getElementById('filenameInput').value = defaultFilename;
        updateFilenamePreview();
    };
    
    const overlay = document.createElement('div');
    overlay.className = 'selection-overlay';
    
    selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    
    container.appendChild(img);
    container.appendChild(overlay);
    overlay.appendChild(selectionBox);
    
    overlay.addEventListener('mousedown', startSelection);
    overlay.addEventListener('mousemove', updateSelection);
    overlay.addEventListener('mouseup', endSelection);
    overlay.addEventListener('mouseenter', showMagnifier);
    overlay.addEventListener('mouseleave', hideMagnifier);
    overlay.addEventListener('click', handleImageClick);
    
    currentImage = img;
    
    document.getElementById('copyBtn').disabled = false;
    document.getElementById('saveBtn').disabled = false;
}

function startSelection(e) {
    if (!currentImage) return;
    
    // 在取色模式下不进行区域选择
    if (colorPickerMode) return;
    
    isSelecting = true;
    const imgRect = currentImage.getBoundingClientRect();
    
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    
    selection.x1 = Math.max(0, Math.min(x, currentImage.offsetWidth));
    selection.y1 = Math.max(0, Math.min(y, currentImage.offsetHeight));
    selection.x2 = selection.x1;
    selection.y2 = selection.y1;
    
    updateSelectionBox();
    updateCoords();
}

function updateSelection(e) {
    updateMagnifier(e);
    
    if (!isSelecting || !currentImage) return;
    
    const imgRect = currentImage.getBoundingClientRect();
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    
    selection.x2 = Math.max(0, Math.min(x, currentImage.offsetWidth));
    selection.y2 = Math.max(0, Math.min(y, currentImage.offsetHeight));
    
    updateSelectionBox();
    updateCoords();
}

function endSelection(e) {
    isSelecting = false;
}

function showMagnifier() {
    if (!currentImage) return;
    document.getElementById('magnifier').style.display = 'block';
}

function hideMagnifier() {
    document.getElementById('magnifier').style.display = 'none';
}

function updateMagnifier(e) {
    if (!currentImage || !magnifierCtx) return;
    
    const imgRect = currentImage.getBoundingClientRect();
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    
    // 转换为实际图片坐标
    const scaleX = currentImage.naturalWidth / currentImage.offsetWidth;
    const scaleY = currentImage.naturalHeight / currentImage.offsetHeight;
    const realX = Math.round(x * scaleX);
    const realY = Math.round(y * scaleY);
    
    // 更新坐标信息
    document.getElementById('magnifierInfo').textContent = '坐标: ' + realX + ',' + realY;
    
    // 智能调整放大镜位置，避免遮挡鼠标
    updateMagnifierPosition(e);
    
    // 绘制放大的像素区域 (12x12像素区域，放大25倍)
    const magnifySize = 12;
    const scale = 25;
    
    magnifierCtx.imageSmoothingEnabled = false;
    
    // 清除画布并填充背景色
    magnifierCtx.fillStyle = '#f0f0f0';
    magnifierCtx.fillRect(0, 0, 300, 300);
    
    // 计算放大区域，确保始终是完整的magnifySize大小
    const halfSize = Math.floor(magnifySize / 2);
    let startX = realX - halfSize;
    let startY = realY - halfSize;
    
    // 处理边界情况，保持区域大小不变
    if (startX < 0) startX = 0;
    if (startY < 0) startY = 0;
    if (startX + magnifySize > currentImage.naturalWidth) {
        startX = currentImage.naturalWidth - magnifySize;
    }
    if (startY + magnifySize > currentImage.naturalHeight) {
        startY = currentImage.naturalHeight - magnifySize;
    }
    
    // 确保坐标不为负数
    startX = Math.max(0, startX);
    startY = Math.max(0, startY);
    
    const endX = Math.min(currentImage.naturalWidth, startX + magnifySize);
    const endY = Math.min(currentImage.naturalHeight, startY + magnifySize);
    
    try {
        // 绘制图像，始终填满整个canvas
        magnifierCtx.drawImage(
            currentImage,
            startX, startY, endX - startX, endY - startY,
            0, 0, 300, 300
        );
        
        // 绘制像素网格
        magnifierCtx.strokeStyle = 'rgba(0,0,0,0.2)';
        magnifierCtx.lineWidth = 1;
        magnifierCtx.beginPath();
        
        // 计算每个像素在canvas中的大小
        const pixelSizeX = 300 / (endX - startX);
        const pixelSizeY = 300 / (endY - startY);
        
        // 垂直线
        for (let i = 0; i <= (endX - startX); i++) {
            const x = i * pixelSizeX;
            magnifierCtx.moveTo(x, 0);
            magnifierCtx.lineTo(x, 300);
        }
        
        // 水平线
        for (let i = 0; i <= (endY - startY); i++) {
            const y = i * pixelSizeY;
            magnifierCtx.moveTo(0, y);
            magnifierCtx.lineTo(300, y);
        }
        magnifierCtx.stroke();
        
        // 绘制中心十字线
        magnifierCtx.strokeStyle = '#ff0000';
        magnifierCtx.lineWidth = 2;
        magnifierCtx.beginPath();
        magnifierCtx.moveTo(150, 130);
        magnifierCtx.lineTo(150, 170);
        magnifierCtx.moveTo(130, 150);
        magnifierCtx.lineTo(170, 150);
        magnifierCtx.stroke();
    } catch (e) {
        // 忽略绘制错误
    }
}

function updateMagnifierPosition(e) {
    const magnifier = document.getElementById('magnifier');
    const imageArea = document.querySelector('.image-area');
    
    if (!magnifier || !imageArea) return;
    
    // 获取图片区域的尺寸
    const areaRect = imageArea.getBoundingClientRect();
    const magnifierWidth = 300;
    const magnifierHeight = 300;
    const margin = 20;
    
    // 获取鼠标在图片区域内的相对位置
    const mouseX = e.clientX - areaRect.left;
    const mouseY = e.clientY - areaRect.top;
    
    let newTop = margin;
    let newLeft = 'auto';
    let newRight = margin;
    let newBottom = 'auto';
    
    // 计算鼠标在图片区域的相对位置（百分比）
    const mouseXPercent = mouseX / areaRect.width;
    const mouseYPercent = mouseY / areaRect.height;
    
    // 智能选择放大镜位置，避免遮挡鼠标
    if (mouseXPercent > 0.6 && mouseYPercent < 0.4) {
        // 鼠标在右上角，放大镜移到左上角
        newLeft = margin + 'px';
        newRight = 'auto';
        newTop = margin;
    } else if (mouseXPercent > 0.6 && mouseYPercent > 0.6) {
        // 鼠标在右下角，放大镜移到左上角
        newLeft = margin + 'px';
        newRight = 'auto';
        newTop = margin;
    } else if (mouseXPercent < 0.4 && mouseYPercent < 0.4) {
        // 鼠标在左上角，放大镜移到右上角
        newLeft = 'auto';
        newRight = margin + 'px';
        newTop = margin;
    } else if (mouseXPercent < 0.4 && mouseYPercent > 0.6) {
        // 鼠标在左下角，放大镜移到右上角
        newLeft = 'auto';
        newRight = margin + 'px';
        newTop = margin;
    } else if (mouseYPercent < 0.4) {
        // 鼠标在上方中间，放大镜移到右下角
        newLeft = 'auto';
        newRight = margin + 'px';
        newTop = 'auto';
        newBottom = margin + 'px';
    } else {
        // 默认位置：右上角
        newLeft = 'auto';
        newRight = margin + 'px';
        newTop = margin;
    }
    
    // 应用新位置
    magnifier.style.top = typeof newTop === 'number' ? newTop + 'px' : newTop;
    magnifier.style.left = newLeft;
    magnifier.style.right = newRight;
    magnifier.style.bottom = typeof newBottom === 'number' ? newBottom + 'px' : newBottom;
}

function handleImageClick(e) {
    if (!currentImage) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const imgRect = currentImage.getBoundingClientRect();
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    
    // 转换为实际图片坐标
    const scaleX = currentImage.naturalWidth / currentImage.offsetWidth;
    const scaleY = currentImage.naturalHeight / currentImage.offsetHeight;
    const realX = Math.round(x * scaleX);
    const realY = Math.round(y * scaleY);
    
    // 多点取色模式
    if (multipointMode) {
        const color = getPixelColor(realX, realY);
        if (color) {
            addMultipoint(realX, realY, color);
            showStatus('已添加取色点 (' + realX + ', ' + realY + ') 颜色: ' + color, 'success');
        }
        return;
    }
    
    // 原有的取色模式
    if (!colorPickerMode || selectedColorSlot === -1) return;
    
    // 获取像素颜色
    const color = getPixelColor(realX, realY);
    if (color) {
        const coords = realX + ',' + realY;
        setColorSlot(selectedColorSlot, color, coords);
        showStatus('颜色 ' + color + ' 和坐标 (' + coords + ') 已保存到取色框 ' + (selectedColorSlot + 1), 'success');
    }
}

function getPixelColor(x, y) {
    if (!currentImage) return null;
    
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = currentImage.naturalWidth;
        canvas.height = currentImage.naturalHeight;
        
        ctx.drawImage(currentImage, 0, 0);
        const imageData = ctx.getImageData(x, y, 1, 1);
        const pixel = imageData.data;
        
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        
        // 转换为十六进制（不带#号）
        const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        return hex;
    } catch (e) {
        showStatus('获取颜色失败', 'error');
        return null;
    }
}

function setColorSlot(index, color, coords) {
    colorSlots[index].color = color;
    colorSlots[index].coords = coords;
    
    const preview = document.getElementById('colorPreview' + index);
    const value = document.getElementById('colorValue' + index);
    const coordsElement = document.getElementById('colorCoords' + index);
    const copyBtn = document.getElementById('colorCopyBtn' + index);
    const coordCopyBtn = document.getElementById('coordCopyBtn' + index);
    const copyAllBtn = document.getElementById('copyAllBtn' + index);
    
    preview.style.backgroundColor = '#' + color;
    value.textContent = color;
    coordsElement.textContent = '坐标: ' + coords;
    copyBtn.disabled = false;
    coordCopyBtn.disabled = false;
    copyAllBtn.disabled = false;
}

function updateSelectionBox() {
    if (!selectionBox) return;
    
    const x1 = Math.min(selection.x1, selection.x2);
    const y1 = Math.min(selection.y1, selection.y2);
    const x2 = Math.max(selection.x1, selection.x2);
    const y2 = Math.max(selection.y1, selection.y2);
    
    const width = x2 - x1;
    const height = y2 - y1;
    
    if (width > 2 && height > 2) {
        selectionBox.style.display = 'block';
        selectionBox.style.left = x1 + 'px';
        selectionBox.style.top = y1 + 'px';
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';
    } else {
        selectionBox.style.display = 'none';
    }
}

function updateCoords() {
    if (!currentImage) return;
    
    const imgNaturalWidth = currentImage.naturalWidth;
    const imgNaturalHeight = currentImage.naturalHeight;
    const imgDisplayWidth = currentImage.offsetWidth;
    const imgDisplayHeight = currentImage.offsetHeight;
    
    const scaleX = imgNaturalWidth / imgDisplayWidth;
    const scaleY = imgNaturalHeight / imgDisplayHeight;
    
    const realX1 = Math.round(Math.min(selection.x1, selection.x2) * scaleX);
    const realY1 = Math.round(Math.min(selection.y1, selection.y2) * scaleY);
    const realX2 = Math.round(Math.max(selection.x1, selection.x2) * scaleX);
    const realY2 = Math.round(Math.max(selection.y1, selection.y2) * scaleY);
    
    const coords = realX1 + ',' + realY1 + ',' + realX2 + ',' + realY2;
    
    document.getElementById('coordsDisplay').textContent = coords;
}

function copyCoords() {
    if (!currentImage) return;
    
    const imgNaturalWidth = currentImage.naturalWidth;
    const imgNaturalHeight = currentImage.naturalHeight;
    const imgDisplayWidth = currentImage.offsetWidth;
    const imgDisplayHeight = currentImage.offsetHeight;
    
    const scaleX = imgNaturalWidth / imgDisplayWidth;
    const scaleY = imgNaturalHeight / imgDisplayHeight;
    
    const realX1 = Math.round(Math.min(selection.x1, selection.x2) * scaleX);
    const realY1 = Math.round(Math.min(selection.y1, selection.y2) * scaleY);
    const realX2 = Math.round(Math.max(selection.x1, selection.x2) * scaleX);
    const realY2 = Math.round(Math.max(selection.y1, selection.y2) * scaleY);
    
    const coords = realX1 + ',' + realY1 + ',' + realX2 + ',' + realY2;
    
    navigator.clipboard.writeText(coords).then(() => {
        showStatus('坐标已复制到剪贴板', 'success');
    }).catch(() => {
        showStatus('复制失败', 'error');
    });
}

function updateFilenamePreview() {
    const filename = document.getElementById('filenameInput').value.trim();
    const format = document.getElementById('formatSelect').value;
    const preview = document.getElementById('previewFilename');
    
    if (filename) {
        preview.textContent = filename + '.' + format;
    } else {
        preview.textContent = '截图_时间戳.' + format;
    }
}

document.getElementById('filenameInput').addEventListener('input', updateFilenamePreview);
document.getElementById('formatSelect').addEventListener('change', updateFilenamePreview);

async function saveImage() {
    if (!currentImage) {
        showStatus('请先截图', 'error');
        return;
    }
    
    const filename = document.getElementById('filenameInput').value.trim();
    const format = document.getElementById('formatSelect').value;
    
    if (!filename) {
        showStatus('请输入文件名', 'error');
        return;
    }
    
    showStatus('正在准备下载...', 'info');
    
    try {
        const blob = await saveImageData();
        downloadFile(blob, filename, format);
        showStatus('✅ 下载已开始', 'success');
    } catch (error) {
        showStatus('下载失败: ' + error.message, 'error');
    }
}

function downloadFile(blob, filename, format) {
    const url = window.URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename + '.' + format;
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 1000);
}

async function saveImageData() {
    const imgNaturalWidth = currentImage.naturalWidth;
    const imgNaturalHeight = currentImage.naturalHeight;
    const imgDisplayWidth = currentImage.offsetWidth;
    const imgDisplayHeight = currentImage.offsetHeight;
    
    const scaleX = imgNaturalWidth / imgDisplayWidth;
    const scaleY = imgNaturalHeight / imgDisplayHeight;
    
    const realX1 = Math.round(Math.min(selection.x1, selection.x2) * scaleX);
    const realY1 = Math.round(Math.min(selection.y1, selection.y2) * scaleY);
    const realX2 = Math.round(Math.max(selection.x1, selection.x2) * scaleX);
    const realY2 = Math.round(Math.max(selection.y1, selection.y2) * scaleY);
    
    if (realX2 - realX1 < 1 || realY2 - realY1 < 1) {
        throw new Error('请先选择区域');
    }
    
    const format = document.getElementById('formatSelect').value;
    const filename = document.getElementById('filenameInput').value.trim();
    
    const response = await fetch(API_BASE + '/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            x1: realX1,
            y1: realY1,
            x2: realX2,
            y2: realY2,
            format: format,
            filename: filename
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '保存失败');
    }
    
    return await response.blob();
}

function toggleMultipointMode() {
    multipointMode = !multipointMode;
    const btn = document.getElementById('multipointBtn');
    const clearBtn = document.getElementById('clearBtn');
    const generateBtn = document.getElementById('generateBtn');
    
    if (multipointMode) {
        btn.textContent = '🎯 退出多点模式';
        btn.classList.add('active');
        clearBtn.disabled = false;
        generateBtn.disabled = false;
        document.getElementById('generateRelativeBtn').disabled = false;
        showStatus('多点取色模式已启用，点击图片上的点添加取色点', 'info');
    } else {
        btn.textContent = '🎯 多点取色模式';
        btn.classList.remove('active');
        clearBtn.disabled = true;
        generateBtn.disabled = true;
        document.getElementById('generateRelativeBtn').disabled = true;
        showStatus('多点取色模式已关闭', 'info');
    }
}

function clearMultipoints() {
    multipoints = [];
    updateMultipointDisplay();
    showStatus('已清除所有取色点', 'success');
}

function generateCode() {
    if (multipoints.length === 0) {
        showStatus('没有取色点，无法生成代码', 'error');
        return;
    }
    
    let code = 'points := [][]interface{}{\n';
    multipoints.forEach((point, index) => {
        code += '\t{' + point.x + ', ' + point.y + ', "' + point.color + '"},\n';
    });
    code += '}\n';
    code += 'exists := core.Color.IsExistByMultipoints(points, 0.9)';
    
    // 复制到剪贴板
    navigator.clipboard.writeText(code).then(() => {
        showStatus('代码已复制到剪贴板', 'success');
    }).catch(() => {
        showStatus('复制失败', 'error');
    });
}

// 全局函数，确保可以被HTML调用
window.generateRelativeCode = function() {
    console.log('✅ generateRelativeCode函数被调用了！');
    console.log('✅ 当前多点数量:', multipoints.length);
    
    if (multipoints.length === 0) {
        console.log('❌ 没有取色点');
        showStatus('没有取色点，无法生成代码', 'error');
        return;
    }
    
    console.log('✅ 开始生成相对坐标代码，当前点数:', multipoints.length);
    console.log('✅ 当前所有点:', multipoints);
    
    // 找到最左上角的点作为原点(0,0)
    let minX = multipoints[0].x;
    let minY = multipoints[0].y;
    
    multipoints.forEach(point => {
        if (point.x < minX) minX = point.x;
        if (point.y < minY) minY = point.y;
    });
    
    console.log('✅ 原点坐标:', minX, minY);
    
    // 生成特殊格式的字符串：相似度|x,y,color;x,y,color
    let code = '0.9|';
    multipoints.forEach((point, index) => {
        const relativeX = point.x - minX;
        const relativeY = point.y - minY;
        // 移除颜色前缀的#号
        const color = point.color.replace('#', '');
        if (index > 0) {
            code += ';';
        }
        code += relativeX + ',' + relativeY + ',' + color;
    });
    
    console.log('✅ 生成的代码:', code);
    
    // 尝试复制到剪贴板
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            console.log('✅ 剪贴板复制成功');
            showStatus('相对坐标代码已复制到剪贴板（原点: ' + minX + ',' + minY + '）', 'success');
        }).catch((error) => {
            console.error('❌ 剪贴板复制失败:', error);
            showStatus('剪贴板复制失败: ' + error.message, 'error');
        });
    } else {
        console.log('⚠️ 浏览器不支持剪贴板API');
        showStatus('浏览器不支持剪贴板，请手动复制控制台中的代码', 'info');
    }
}

function updateMultipointDisplay() {
    const clearBtn = document.getElementById('clearBtn');
    const generateBtn = document.getElementById('generateBtn');
    const generateRelativeBtn = document.getElementById('generateRelativeBtn');
    const countElement = document.getElementById('multipointCount');
    const listElement = document.getElementById('multipointList');
    
    console.log('📊 更新按钮状态，当前点数:', multipoints.length);
    console.log('📊 generateRelativeBtn元素:', generateRelativeBtn);
    
    clearBtn.disabled = multipoints.length === 0;
    generateBtn.disabled = multipoints.length === 0;
    if (generateRelativeBtn) {
        generateRelativeBtn.disabled = multipoints.length === 0;
        console.log('📊 generateRelativeBtn.disabled设置为:', generateRelativeBtn.disabled);
    } else {
        console.log('❌ generateRelativeBtn元素未找到！');
    }
    
    // 更新计数
    countElement.textContent = '已添加 ' + multipoints.length + ' 个点';
    
    // 更新列表显示
    if (multipoints.length === 0) {
        listElement.innerHTML = '<div class="multipoint-placeholder">点击图片上的点添加取色点</div>';
    } else {
        let html = '';
        multipoints.forEach((point, index) => {
            html += '<div class="multipoint-item">' +
                '<div class="multipoint-color" style="background-color: #' + point.color + '"></div>' +
                '<div class="multipoint-details">' +
                    '<div>' + point.color + '</div>' +
                    '<div class="multipoint-coords">(' + point.x + ', ' + point.y + ')</div>' +
                '</div>' +
                '<button class="multipoint-remove" onclick="removeMultipoint(' + index + ')">×</button>' +
                '</div>';
        });
        listElement.innerHTML = html;
    }
}

function addMultipoint(x, y, color) {
    multipoints.push({ x, y, color });
    updateMultipointDisplay();
}

function removeMultipoint(index) {
    if (index >= 0 && index < multipoints.length) {
        const point = multipoints[index];
        multipoints.splice(index, 1);
        updateMultipointDisplay();
        showStatus('已删除取色点 (' + point.x + ', ' + point.y + ')', 'success');
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.className = 'status ' + type;
    status.textContent = message;
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            status.textContent = '';
            status.className = '';
        }, 3000);
    }
}

