let currentCardBox = 0;
let currentCopiedBox = 0;
let copiedBoxes = document.querySelectorAll('.copied-box');
const cardBoxes = document.querySelectorAll('.card-box');
const buttons = document.querySelectorAll('button');
let copiedImagesMap = {};
let isCopying = false;

function showBox(boxes, index) {
    boxes.forEach((box, i) => {
        box.classList.toggle('active', i === index);
    });
}

buttons.forEach(btn => {
    btn.addEventListener('click', function(wave) {
        let x = wave.clientX - wave.target.offsetLeft;
        let y = wave.clientY - wave.target.offsetTop;
        
        let waves = document.createElement('span');
        waves.style.left = x + 'px';
        waves.style.top = y + 'px';
        this.appendChild(waves);

        setTimeout(() => {
            waves.remove()
        }, 1000);
    })
 });

function prevCardBox() {
    currentCardBox = (currentCardBox > 0) ? currentCardBox - 1 : cardBoxes.length - 1;
    showBox(cardBoxes, currentCardBox);
}

function nextCardBox() {
    currentCardBox = (currentCardBox < cardBoxes.length - 1) ? currentCardBox + 1 : 0;
    showBox(cardBoxes, currentCardBox);
}

function prevCopiedBox() {
    currentCopiedBox = (currentCopiedBox > 0) ? currentCopiedBox - 1 : copiedBoxes.length - 1;
    showBox(copiedBoxes, currentCopiedBox);
}

function nextCopiedBox() {
    currentCopiedBox = (currentCopiedBox < copiedBoxes.length - 1) ? currentCopiedBox + 1 : 0;
    showBox(copiedBoxes, currentCopiedBox);
}

function takeScreenshot() {
    const copiedBoxes = document.querySelectorAll('.copied-box');
    if (copiedBoxes.length === 0) return;

    const promises = [];
    const originalVisibility = [];

    copiedBoxes.forEach((box, index) => {
        originalVisibility[index] = box.style.display;
        box.style.display = 'block'; 
        promises.push(domtoimage.toPng(box));
    });

    Promise.all(promises)
        .then(images => Promise.all(images.map(src => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        })))
        .then(imgElements => {
            const padding = 20; 
            const maxWidth = Math.max(...imgElements.map(img => img.width + padding * 2));
            const totalHeight = imgElements.reduce((sum, img) => sum + img.height + padding * 2, 0);
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = maxWidth;
            combinedCanvas.height = totalHeight;
            const context = combinedCanvas.getContext('2d');

            let yOffset = 0;
            imgElements.forEach(img => {
                const xOffset = (combinedCanvas.width - img.width - padding * 2) / 2;
                context.drawImage(img, xOffset, yOffset + padding);
                yOffset += img.height + padding;
            });

            const imgData = combinedCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = 'combined-screenshot.png';
            link.click();
        })
        .catch(error => console.error('Error capturing images:', error))
        .finally(() => {
            copiedBoxes.forEach((box, index) => {
                box.style.display = originalVisibility[index];
            });
        });
}

showBox(cardBoxes, currentCardBox);
showBox(copiedBoxes, currentCopiedBox);

document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('.card-box img');
    images.forEach(img => {
        img.addEventListener('click', function() {
            toggleImageSelection(img);
        });
    });

    function toggleImageSelection(img) {
        const src = img.src;
        if (img.style.opacity === '0.5' && !isCopying) {
            img.style.opacity = '1.0';
            removeCopiedImage(src, img);
        } else {
            if (!isCopying) {
                img.style.opacity = '0.5';
                copyImage(img);
            }
        }
    }

    function copyImage(img) {
        isCopying = true;
        const src = img.src;
        const originalBoxShadow = getComputedStyle(img).boxShadow;

        if (!copiedImagesMap[src]) {
            const copiedImg = img.cloneNode();
            copiedImg.style.opacity = '1.0';
            copiedImg.setAttribute('data-box-shadow', originalBoxShadow);
            copiedImg.style.boxShadow = originalBoxShadow;
            copiedImg.style.border= '2px solid black';
            copiedImagesMap[src] = {
                element: copiedImg,
                position: null
            };

            let targetContainer = null;

            let existingBoxWithSpace = Array.from(copiedBoxes).find(box => {
                const boxImages = box.querySelectorAll('.copied-images img');
                return boxImages.length < 20;
            });

            if (existingBoxWithSpace) {
                targetContainer = existingBoxWithSpace.querySelector('.copied-images');
            } else {
                targetContainer = createNewCopiedBox();
            }        
            animateImage(img, copiedImg, targetContainer);
        } else {
            isCopying = false;
        }
    }  

    function animateImage(originalImg, copiedImg, targetContainer) {
        const originalRect = originalImg.getBoundingClientRect();
        const containerRect = targetContainer.getBoundingClientRect();
    
        const targetPosition = calculateTargetPosition(targetContainer);
    
        const clone = copiedImg.cloneNode();
        document.body.appendChild(clone);
        clone.classList.add('animated-clone');
        clone.style.left = `${originalRect.left + window.scrollX}px`;
        clone.style.top = `${originalRect.top + window.scrollY}px`;
    
        requestAnimationFrame(() => {
            const translateX = containerRect.left + targetPosition.x - originalRect.left;
            const translateY = containerRect.top + targetPosition.y - originalRect.top;
            clone.style.transform = `translate(${translateX}px, ${translateY}px)`;
    
            copiedImagesMap[copiedImg.src].position = {
                left: containerRect.left + targetPosition.x + window.scrollX,
                top: containerRect.top + targetPosition.y + window.scrollY
            };
        });
    
        clone.addEventListener('transitionend', () => {
            targetContainer.appendChild(copiedImg);
            document.body.removeChild(clone);
            isCopying = false;
        });
    }
   
    function animateImageBack(copiedImg, originalImg) {
        const originalRect = originalImg.getBoundingClientRect();
        let storedPosition = copiedImg.getBoundingClientRect();
        if (storedPosition.left === 0){
            storedPosition = copiedImagesMap[copiedImg.src].position;
        } 
        const clone = copiedImg.cloneNode();
        document.body.appendChild(clone);
        clone.classList.add('animated-clone-back');
        clone.style.left = `${storedPosition.left}px`;
        clone.style.top = `${storedPosition.top}px`;
    
        requestAnimationFrame(() => {
            const translateX = originalRect.left + window.scrollX - storedPosition.left;
            const translateY = originalRect.top + window.scrollY - storedPosition.top;
            clone.style.transform = `translate(${translateX}px, ${translateY}px)`;
        });
    
        clone.addEventListener('transitionend', () => {
            document.body.removeChild(clone);
        });
    }    
  
    function calculateTargetPosition(container) {
        const images = container.querySelectorAll('img');
        const row = Math.floor(images.length / 5);
        const col = images.length % 5;
        const offset = 8; 
        return {
            x: col * (111 + offset),
            y: row * (166 + offset)
        };
    }

    function removeCopiedImage(src, originalImg) {
        if (copiedImagesMap[src]) {
            copiedBoxes = document.querySelectorAll('.copied-box');
            copiedBoxes.forEach((box, index) => {
                const boxImages = box.querySelector('.copied-images');
                const imgToRemove = Array.from(boxImages.querySelectorAll('img')).find(img => img.src === src);

                if (imgToRemove && imgToRemove.parentNode ) {
                    animateImageBack(imgToRemove, originalImg);
                    imgToRemove.parentNode.removeChild(imgToRemove);
                }
                if (boxImages.children.length < 20 && index < copiedBoxes.length - 1) {
                    let nextBoxImages = copiedBoxes[index + 1].querySelector('.copied-images').children;
                    while (boxImages.children.length < 20 && nextBoxImages.length > 0) {
                        boxImages.appendChild(nextBoxImages[0]);
                    }
                    if (nextBoxImages.length === 0 && copiedBoxes[index + 1].parentNode) {
                        copiedBoxes[index + 1].parentNode.removeChild(copiedBoxes[index + 1]);
                        copiedBoxes = document.querySelectorAll('.copied-box');
                    }
                }
                if (boxImages.children.length === 0 && box !== copiedBoxes[0]) {
                    if (box.parentNode) {
                        box.parentNode.removeChild(box);
                    }
                    copiedBoxes = document.querySelectorAll('.copied-box');
                    currentCopiedBox = Math.max(0, currentCopiedBox - 1);

                    copiedBoxes.forEach((i) => {
                        box.innerHTML = `<h3><span class="color-yellow">All</span> The <span class="color-yellow">Curses</span> You <span class="color-yellow">Selected</span> (${i + 1})</h3><div class="copied-images"></div>`;
                    });
                }
            });
            if (copiedBoxes.length > 0) {
                showBox(copiedBoxes, copiedBoxes.length - 1);
            }
            delete copiedImagesMap[src];
        }
    }
    
    function createNewCopiedBox() {
        currentCopiedBox++;
        const newCopiedBox = document.createElement('div');
        newCopiedBox.classList.add('copied-box');
        newCopiedBox.innerHTML = `<h3><span class="color-yellow">All</span> The <span class="color-yellow">Curses</span> You <span class="color-yellow">Selected</span> (${copiedBoxes.length + 1})</h3><div class="copied-images"></div>`;
        document.querySelector('.container').appendChild(newCopiedBox);
        copiedBoxes = document.querySelectorAll('.copied-box');
        showBox(copiedBoxes, currentCopiedBox);
        return newCopiedBox.querySelector('.copied-images');
    }
});