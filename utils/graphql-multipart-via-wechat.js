import mimes from "mime-db"

const br = '\r\n'
const br2 = '\r\n\r\n'
const boundary = generateBoundary()
const splitBoundary = "--" + boundary
const commonTypes = {
	// 空间复杂度 换取 时间复杂度
	// 避免每次上传图片时 getType方法 大量遍历MIME标准，提高性能
}
export let uploadTask = null

export async function graphqlUpload({
										url,
										header,
										query,
										variables,
										uploadKey,
										files,
										success,
										fail,
										complete
									}) {
	let data = await toBuffer(query, variables, uploadKey, files)
	uploadTask = wx.request({
		url,
		data,
		method: "POST",
		header: {
			...header,
			'Content-Type': 'multipart/form-data; boundary=' + boundary
		},
		success(s) {
			success(s)
		},
		fail(f) {
			fail && fail(f)
		},
		complete(c) {
			complete && complete(c)
		}
	})
}

/**
 * 转换成 ArrayBuffer
 * @param {String} query
 * @param {Object} variables
 * @param {String} uploadKey
 * @param {Object} files
 */
async function toBuffer(query, variables, uploadKey, files) {
	const mixUints = []

	let operations = {
		query: query,
		variables: variables
	}
	let fieldHeader = getFormDataHeader("operations")
	mixUints.push(str2Uint8Arr(fieldHeader))
	mixUints.push(str2Uint8Arr(JSON.stringify(operations)))
	mixUints.push(str2Uint8Arr(br))

	let map = {},
		fileIdx = 0;
	for (const key in files) {
		const filePath = files[key]
		let idx = fileIdx++,
			mapper = "file" + idx;

		const fileHeader = getFileHeader(mapper, String(filePath))
		if (fileHeader == null) continue
		mixUints.push(str2Uint8Arr(fileHeader))

		const fileUint8Arr = await file2Uint8Arr(String(filePath))
		mixUints.push(fileUint8Arr)
		mixUints.push(str2Uint8Arr(br))

		map[mapper] = ["variables." + uploadKey + "." + idx];
	}

	let mapHeader = getFormDataHeader("map")
	mixUints.push(str2Uint8Arr(mapHeader))
	mixUints.push(str2Uint8Arr(JSON.stringify(map)))

	mixUints.push(str2Uint8Arr(br))
	mixUints.push(str2Uint8Arr(splitBoundary + "--")) //结尾

	return convert2Buffer(mixUints)
}

/**
 * mix数组转换成 arraybuffer
 * @param {Object} mixUints
 */
function convert2Buffer(mixUints) {
	const len = mixUints.reduce((prev, cur) => {
		return prev + cur.length
	}, 0)
	const arrayBuffer = new ArrayBuffer(len)
	const buffer = new Uint8Array(arrayBuffer)
	let sum = 0
	for (let i = 0; i < mixUints.length; i++) {
		for (let j = 0; j < mixUints[i].length; j++) {
			buffer[sum + j] = mixUints[i][j]
		}
		sum += mixUints[i].length
	}
	return arrayBuffer
}

/**
 * 生成operations和map的boundary串
 * @param {Object} name
 */
function getFormDataHeader(name) {
	return `${splitBoundary}${br}Content-Disposition: form-data; name="${name}"${br2}`
}

/**
 * 生成图片字段boundary串
 * @param {Object} name
 * @param {Object} filePath
 */
function getFileHeader(name, filePath) {
	const contentType = getType(filePath)
	if (contentType == null) return null;
	const filename = filePath.replace(/^(.*)\/(.*)/, "$2")
	return `${splitBoundary}${br}Content-Disposition: form-data; name="${name}"; filename="${filename}"${br}Content-Type: ${contentType}${br2}`
}

/**
 * 生成boundary
 */
function generateBoundary() {
	let boundary = "----WebKitFormBoundary"
	const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
	const len = chars.length
	for (let i = 0; i < 16; i++) {
		boundary += chars.charAt(~~(Math.random() * len));
	}
	return boundary;
}

/**
 * 字符串转 Uint8Array
 * @param {String} str
 */
function str2Uint8Arr(str) {
	let bytes = [];
	for (let i = 0; i < str.length; i++) {
		let code = str.charCodeAt(i);
		if (0x00 <= code && code <= 0x7f) {
			bytes.push(code);
		} else if (0x80 <= code && code <= 0x7ff) {
			bytes.push((192 | (31 & (code >> 6))));
			bytes.push((128 | (63 & code)))
		} else if ((0x800 <= code && code <= 0xd7ff) || (0xe000 <= code && code <= 0xffff)) {
			bytes.push((224 | (15 & (code >> 12))));
			bytes.push((128 | (63 & (code >> 6))));
			bytes.push((128 | (63 & code)))
		}
	}
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] &= 0xff;
	}
	return bytes
}

/**
 * 文件转 Uint8Array
 * @param {String} filePath
 */
function file2Uint8Arr(filePath) {
	return new Promise(resolve => {
		wx.getFileSystemManager().readFile({
			filePath,
			success(res) {
				resolve(new Uint8Array(res.data))
			},
			fail(err) {
				console.error(err.errMsg)
			}
		})
	})
}

/**
 * 获取文件类型
 * @param {Object} url
 */
function getType(url) {
	if (!url) return null
	const index = url.lastIndexOf(".");
	const ext = url.substr(index + 1);
	if (commonTypes.hasOwnProperty(ext)) {
		return commonTypes[ext]
	}
	for (let k in mimes) {
		if (mimes[k].extensions === undefined) continue
		if (mimes[k].extensions.indexOf(ext) !== -1) {
			commonTypes[ext] = k
			return k
		}
	}
	return null
}
